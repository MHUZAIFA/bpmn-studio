import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { Chat } from '@/models/Chat';
import { Branch } from '@/models/Branch';
import { BpmnVersion } from '@/models/BpmnVersion';
import { DeployedBpmn } from '@/models/DeployedBpmn';
import { requireAuth, requireRole } from '@/lib/rbac';
import { Role } from '@/types';

export const GET = requireAuth(async (_req: NextRequest, auth) => {
  await connectDB();
  const chats = await Chat.find({ organizationId: auth.organizationId })
    .sort({ updatedAt: -1 })
    .lean();
  return NextResponse.json({ chats });
});

export const PATCH = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const { chatId, name } = await req.json();

  if (!chatId || !name?.trim()) {
    return NextResponse.json({ error: 'chatId and name are required' }, { status: 400 });
  }

  const chat = await Chat.findOneAndUpdate(
    { _id: chatId, organizationId: auth.organizationId },
    { name: name.trim() },
    { new: true }
  );

  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  return NextResponse.json({ chat });
});

export const DELETE = requireRole(Role.ADMIN, async (req: NextRequest, auth) => {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const chatId = searchParams.get('chatId');

  if (!chatId) {
    return NextResponse.json({ error: 'chatId is required' }, { status: 400 });
  }

  const chat = await Chat.findOne({ _id: chatId, organizationId: auth.organizationId });
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  await BpmnVersion.deleteMany({ chatId, organizationId: auth.organizationId });
  await DeployedBpmn.deleteMany({ chatId, organizationId: auth.organizationId });
  await Branch.deleteMany({ chatId, organizationId: auth.organizationId });
  await Chat.deleteOne({ _id: chatId, organizationId: auth.organizationId });

  return NextResponse.json({ success: true });
});

export const POST = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  await connectDB();
  const { name } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Chat name is required' }, { status: 400 });
  }

  const chat = await Chat.create({
    organizationId: auth.organizationId,
    userId: auth.userId,
    name: name.trim(),
  });

  await Branch.create({
    organizationId: auth.organizationId,
    chatId: chat._id,
    name: 'main',
  });

  return NextResponse.json({ chat }, { status: 201 });
});
