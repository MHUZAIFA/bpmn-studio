import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';
import { requireAuth } from '@/lib/rbac';

export const GET = requireAuth(async (_req: NextRequest, auth) => {
  await connectDB();
  const user = await User.findById(auth.userId).select('-passwordHash');
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
  const org = await Organization.findById(auth.organizationId);
  return NextResponse.json({
    user: {
      id: user._id,
      username: user.username,
      role: user.role,
      organizationId: user.organizationId,
      organizationName: org?.name,
    },
  });
});
