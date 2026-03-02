import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { BpmnVersion } from '@/models/BpmnVersion';
import { requireRole } from '@/lib/rbac';
import { decryptXml } from '@/lib/encryption';
import { diffBpmnXml } from '@/services/diffEngine';
import { Role } from '@/types';

export const POST = requireRole(Role.VIEWER, async (req: NextRequest, auth) => {
  await connectDB();
  const { sourceVersionId, targetVersionId } = await req.json();

  if (!sourceVersionId || !targetVersionId) {
    return NextResponse.json(
      { error: 'sourceVersionId and targetVersionId are required' },
      { status: 400 }
    );
  }

  const sourceVersion = await BpmnVersion.findOne({
    _id: sourceVersionId,
    organizationId: auth.organizationId,
  });
  const targetVersion = await BpmnVersion.findOne({
    _id: targetVersionId,
    organizationId: auth.organizationId,
  });

  if (!sourceVersion || !targetVersion) {
    return NextResponse.json({ error: 'Version not found' }, { status: 404 });
  }

  const sourceXml = decryptXml(sourceVersion.encryptedXml, sourceVersion.iv);
  const targetXml = decryptXml(targetVersion.encryptedXml, targetVersion.iv);

  const diff = diffBpmnXml(sourceXml, targetXml);

  return NextResponse.json({
    diff,
    sourceXml,
    targetXml,
  });
});
