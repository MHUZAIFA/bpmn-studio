import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { BpmnVersion } from '@/models/BpmnVersion';
import { Branch } from '@/models/Branch';
import { Chat } from '@/models/Chat';
import { DeployedBpmn } from '@/models/DeployedBpmn';
import { requireRole } from '@/lib/rbac';
import { decryptXml } from '@/lib/encryption';
import { deployToFlowable } from '@/services/flowable';
import { logAudit } from '@/lib/audit';
import { checkRateLimit, DEPLOY_RATE_LIMIT } from '@/lib/rateLimit';
import { Role } from '@/types';

export const POST = requireRole(Role.ADMIN, async (req: NextRequest, auth) => {
  const rateCheck = checkRateLimit(`deploy:${auth.organizationId}`, DEPLOY_RATE_LIMIT);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: 'Deploy rate limit exceeded. Try again later.', resetIn: rateCheck.resetIn },
      { status: 429 }
    );
  }

  await connectDB();
  const { versionId } = await req.json();

  if (!versionId) {
    return NextResponse.json({ error: 'versionId is required' }, { status: 400 });
  }

  const version = await BpmnVersion.findOne({
    _id: versionId,
    organizationId: auth.organizationId,
  });
  if (!version) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const chat = await Chat.findOne({ _id: version.chatId, organizationId: auth.organizationId });
  if (!chat) {
    return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
  }

  try {
    const xml = decryptXml(version.encryptedXml, version.iv);
    const result = await deployToFlowable(xml, chat.name);

    const deployed = await DeployedBpmn.create({
      organizationId: auth.organizationId,
      userId: auth.userId,
      chatId: version.chatId,
      branchId: version.branchId,
      versionId: version._id,
      deploymentId: result.deploymentId,
      processDefinitionId: result.processDefinitionId,
    });

    await logAudit({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: 'DEPLOY',
      entityType: 'DeployedBpmn',
      entityId: deployed._id.toString(),
      metadata: {
        versionId,
        deploymentId: result.deploymentId,
        chatName: chat.name,
      },
    });

    return NextResponse.json({ deployed, deploymentId: result.deploymentId });
  } catch (error) {
    console.error('Deploy error:', error);
    const message = error instanceof Error ? error.message : 'Deployment failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
});

export const GET = requireRole(Role.VIEWER, async (req: NextRequest, auth) => {
  await connectDB();
  const chatId = req.nextUrl.searchParams.get('chatId');

  const filter: Record<string, string> = { organizationId: auth.organizationId };
  if (chatId) filter.chatId = chatId;

  const deployments = await DeployedBpmn.find(filter)
    .sort({ deployedAt: -1 })
    .populate('versionId', 'versionNumber prompt')
    .lean();

  return NextResponse.json({ deployments });
});
