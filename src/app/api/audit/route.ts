import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { AuditLog } from '@/models/AuditLog';
import { requireRole } from '@/lib/rbac';
import { Role } from '@/types';

export const GET = requireRole(Role.OWNER, async (req: NextRequest, auth) => {
  await connectDB();

  const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') || '50'), 100);
  const action = req.nextUrl.searchParams.get('action');
  const entityType = req.nextUrl.searchParams.get('entityType');

  const filter: Record<string, string> = { organizationId: auth.organizationId };
  if (action) filter.action = action;
  if (entityType) filter.entityType = entityType;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('userId', 'username')
      .lean(),
    AuditLog.countDocuments(filter),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  });
});
