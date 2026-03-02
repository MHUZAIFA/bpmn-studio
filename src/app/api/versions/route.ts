import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { BpmnVersion } from '@/models/BpmnVersion';
import { Branch } from '@/models/Branch';
import { Chat } from '@/models/Chat';
import { requireRole } from '@/lib/rbac';
import { decryptXml, encryptXml } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';
import { Role } from '@/types';
import { sanitizeBpmnNamespaces } from '@/lib/bpmn/sanitize';

export const GET = requireRole(Role.VIEWER, async (req: NextRequest, auth) => {
  await connectDB();
  const branchId = req.nextUrl.searchParams.get('branchId');
  const versionId = req.nextUrl.searchParams.get('versionId');

  if (versionId) {
    const version = await BpmnVersion.findOne({
      _id: versionId,
      organizationId: auth.organizationId,
    }).lean();
    if (!version) {
      return NextResponse.json({ error: 'Version not found' }, { status: 404 });
    }

    let xml = decryptXml(version.encryptedXml, version.iv);
    xml = sanitizeBpmnNamespaces(xml);
    return NextResponse.json({
      version: {
        ...version,
        xml,
        encryptedXml: undefined,
        iv: undefined,
      },
    });
  }

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

  const versions = await BpmnVersion.find({
    organizationId: auth.organizationId,
    branchId,
  })
    .select('-encryptedXml -iv')
    .sort({ versionNumber: 1 })
    .lean();

  return NextResponse.json({ versions });
});

export const POST = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const { chatId, branchId, xml, prompt } = await req.json();

  if (!chatId || !branchId || !xml) {
    return NextResponse.json(
      { error: 'chatId, branchId, and xml are required' },
      { status: 400 }
    );
  }

  const chat = await Chat.findOne({ _id: chatId, organizationId: auth.organizationId });
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  const branch = await Branch.findOne({
    _id: branchId,
    organizationId: auth.organizationId,
    chatId,
  });
  if (!branch) {
    return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
  }

  const { encryptedXml, iv } = encryptXml(xml);

  const lastVersion = await BpmnVersion.findOne({ branchId }).sort({ versionNumber: -1 });
  const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  const version = await BpmnVersion.create({
    organizationId: auth.organizationId,
    userId: auth.userId,
    chatId,
    branchId,
    parentVersionId: branch.headVersionId || undefined,
    versionNumber: nextVersionNumber,
    prompt: prompt || 'Manual save',
    encryptedXml,
    iv,
  });

  branch.headVersionId = version._id;
  await branch.save();

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'VERSION_SAVE',
    entityType: 'BpmnVersion',
    entityId: version._id.toString(),
    metadata: { chatId, branchId, versionNumber: nextVersionNumber },
  });

  return NextResponse.json({
    version: {
      _id: version._id,
      versionNumber: version.versionNumber,
      prompt: version.prompt,
      createdAt: version.createdAt,
    },
  }, { status: 201 });
});
