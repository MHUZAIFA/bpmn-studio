import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { BpmnVersion } from '@/models/BpmnVersion';
import { Branch } from '@/models/Branch';
import { Chat } from '@/models/Chat';
import { requireRole } from '@/lib/rbac';
import { getAIProvider } from '@/lib/ai';
import { encryptXml, decryptXml } from '@/lib/encryption';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, AI_RATE_LIMIT } from '@/lib/rateLimit';
import { Role } from '@/types';

export const POST = requireRole(Role.EDITOR, async (req: NextRequest, auth) => {
  const rateCheck = checkRateLimit(`ai:${auth.userId}`, AI_RATE_LIMIT);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.', resetIn: rateCheck.resetIn },
      { status: 429 }
    );
  }

  await connectDB();
  const { chatId, branchId, prompt } = await req.json();

  if (!chatId || !branchId || !prompt?.trim()) {
    return NextResponse.json(
      { error: 'chatId, branchId, and prompt are required' },
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

  let currentXml: string | undefined;
  if (branch.headVersionId) {
    const headVersion = await BpmnVersion.findById(branch.headVersionId);
    if (headVersion) {
      currentXml = decryptXml(headVersion.encryptedXml, headVersion.iv);
    }
  }

  try {
    const aiProvider = getAIProvider();
    const generatedXml = await aiProvider.generateBpmnXML({
      currentXml,
      prompt: prompt.trim(),
    });

    const { encryptedXml: encrypted, iv } = encryptXml(generatedXml);

    const lastVersion = await BpmnVersion.findOne({ branchId })
      .sort({ versionNumber: -1 });
    const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

    const version = await BpmnVersion.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      chatId,
      branchId,
      parentVersionId: branch.headVersionId || undefined,
      versionNumber: nextVersionNumber,
      prompt: prompt.trim(),
      encryptedXml: encrypted,
      iv,
    });

    branch.headVersionId = version._id;
    await branch.save();

    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: 'AI_GENERATE',
      entityType: 'BpmnVersion',
      entityId: version._id.toString(),
      metadata: { chatId, branchId, prompt: prompt.trim(), versionNumber: nextVersionNumber },
    });

    return NextResponse.json({
      version: {
        _id: version._id,
        versionNumber: version.versionNumber,
        prompt: version.prompt,
        createdAt: version.createdAt,
      },
      xml: generatedXml,
    });
  } catch (error) {
    console.error('AI generation error:', error);
    const message = error instanceof Error ? error.message : 'AI generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});
