import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Branch } from '@/models/Branch';
import { Chat } from '@/models/Chat';
import { BpmnVersion } from '@/models/BpmnVersion';
import { requireRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { Role } from '@/types';

export const GET = requireRole(Role.VIEWER, async (req: NextRequest, auth) => {
  await connectDB();
  const chatId = req.nextUrl.searchParams.get('chatId');
  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }

  const chat = await Chat.findOne({ _id: chatId, organizationId: auth.organizationId });
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const branches = await Branch.find({
    organizationId: auth.organizationId,
    chatId,
  })
    .sort({ createdAt: 1 })
    .lean();
  return NextResponse.json({ branches });
});

export const POST = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const { chatId, name, baseVersionId } = await req.json();

  if (!chatId || !name?.trim()) {
    return NextResponse.json({ error: 'chatId and name are required' }, { status: 400 });
  }

  const chat = await Chat.findOne({ _id: chatId, organizationId: auth.organizationId });
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const existing = await Branch.findOne({
    organizationId: auth.organizationId,
    chatId,
    name: name.trim(),
  });
  if (existing) {
    return NextResponse.json({ error: 'Branch name already exists' }, { status: 409 });
  }

  const branch = await Branch.create({
    organizationId: auth.organizationId,
    chatId,
    name: name.trim(),
    baseVersionId: baseVersionId || null,
    headVersionId: baseVersionId || null,
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'BRANCH_CREATE',
    entityType: 'Branch',
    entityId: branch._id.toString(),
    metadata: { chatId, branchName: name, baseVersionId },
  });

  return NextResponse.json({ branch }, { status: 201 });
});

export const PUT = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const { branchId, targetBranchId } = await req.json();

  if (!branchId || !targetBranchId) {
    return NextResponse.json(
      { error: 'branchId and targetBranchId are required' },
      { status: 400 }
    );
  }

  const sourceBranch = await Branch.findOne({
    _id: branchId,
    organizationId: auth.organizationId,
  });
  const targetBranch = await Branch.findOne({
    _id: targetBranchId,
    organizationId: auth.organizationId,
  });

  if (!sourceBranch || !targetBranch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  }

  if (!sourceBranch.headVersionId) {
    return NextResponse.json({ error: 'Source branch has no versions' }, { status: 400 });
  }

  const headVersion = await BpmnVersion.findById(sourceBranch.headVersionId);
  if (!headVersion) {
    return NextResponse.json({ error: 'Head version not found' }, { status: 404 });
  }

  const lastTargetVersion = await BpmnVersion.findOne({ branchId: targetBranchId })
    .sort({ versionNumber: -1 });
  const nextVersion = (lastTargetVersion?.versionNumber ?? 0) + 1;

  const mergedVersion = await BpmnVersion.create({
    organizationId: auth.organizationId,
    userId: auth.userId,
    chatId: sourceBranch.chatId,
    branchId: targetBranchId,
    parentVersionId: targetBranch.headVersionId,
    versionNumber: nextVersion,
    prompt: `Merged from branch "${sourceBranch.name}"`,
    encryptedXml: headVersion.encryptedXml,
    iv: headVersion.iv,
  });

  targetBranch.headVersionId = mergedVersion._id;
  await targetBranch.save();

  sourceBranch.isMerged = true;
  await sourceBranch.save();

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'BRANCH_MERGE',
    entityType: 'Branch',
    entityId: branchId,
    metadata: { targetBranchId, mergedVersionId: mergedVersion._id.toString() },
  });

  return NextResponse.json({ mergedVersion, sourceBranch, targetBranch });
});

export const PATCH = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const { branchId, name } = await req.json();

  if (!branchId || !name?.trim()) {
    return NextResponse.json({ error: 'branchId and name are required' }, { status: 400 });
  }

  const branch = await Branch.findOne({
    _id: branchId,
    organizationId: auth.organizationId,
  });
  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  }

  const duplicate = await Branch.findOne({
    organizationId: auth.organizationId,
    chatId: branch.chatId,
    name: name.trim(),
    _id: { $ne: branchId },
  });
  if (duplicate) {
    return NextResponse.json({ error: 'Branch name already exists' }, { status: 409 });
  }

  const previousName = branch.name;
  branch.name = name.trim();
  await branch.save();

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'BRANCH_RENAME',
    entityType: 'Branch',
    entityId: branchId,
    metadata: { previousName, newName: name.trim() },
  });

  return NextResponse.json({ branch });
});

export const DELETE = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const branchId = req.nextUrl.searchParams.get('branchId');

  if (!branchId) {
    return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
  }

  const branch = await Branch.findOne({
    _id: branchId,
    organizationId: auth.organizationId,
  });
  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  }

  if (branch.name === 'main') {
    return NextResponse.json({ error: 'Cannot delete the main branch' }, { status: 400 });
  }

  await BpmnVersion.deleteMany({
    organizationId: auth.organizationId,
    branchId,
  });

  await Branch.deleteOne({ _id: branchId });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'BRANCH_DELETE',
    entityType: 'Branch',
    entityId: branchId,
    metadata: { branchName: branch.name, chatId: branch.chatId.toString() },
  });

  return NextResponse.json({ success: true });
});
