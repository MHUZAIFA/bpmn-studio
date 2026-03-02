import { AuditLog } from '@/models/AuditLog';
import { connectDB } from '@/lib/db/mongoose';

export async function logAudit(params: {
  organizationId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await connectDB();
    await AuditLog.create({
      organizationId: params.organizationId,
      userId: params.userId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata ?? {},
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
}
