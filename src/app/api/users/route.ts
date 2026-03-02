import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { requireRole } from '@/lib/rbac';
import { logAudit } from '@/lib/audit';
import { Role, ROLE_HIERARCHY } from '@/types';

export const GET = requireRole(Role.ADMIN, async (_req: NextRequest, auth) => {
  await connectDB();
  const users = await User.find({ organizationId: auth.organizationId })
    .select('-passwordHash')
    .sort({ createdAt: 1 })
    .lean();
  return NextResponse.json({ users });
});

export const POST = requireRole(Role.ADMIN, async (req: NextRequest, auth) => {
  await connectDB();
  const { username, password, role } = await req.json();

  if (!username?.trim() || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const assignRole = (role as Role) || Role.VIEWER;
  if (ROLE_HIERARCHY[assignRole] >= ROLE_HIERARCHY[auth.role as Role]) {
    return NextResponse.json(
      { error: 'Cannot assign a role equal to or higher than your own' },
      { status: 403 }
    );
  }

  const existing = await User.findOne({ username: username.toLowerCase().trim() });
  if (existing) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({
    username: username.toLowerCase().trim(),
    passwordHash,
    organizationId: auth.organizationId,
    role: assignRole,
  });

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'USER_INVITE',
    entityType: 'User',
    entityId: user._id.toString(),
    metadata: { invitedUsername: username, assignedRole: assignRole },
  });

  return NextResponse.json(
    {
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId,
      },
    },
    { status: 201 }
  );
});

export const PATCH = requireRole(Role.ADMIN, async (req: NextRequest, auth) => {
  await connectDB();
  const { userId, role } = await req.json();

  if (!userId || !role) {
    return NextResponse.json({ error: 'userId and role are required' }, { status: 400 });
  }

  const targetUser = await User.findOne({
    _id: userId,
    organizationId: auth.organizationId,
  });
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  if (ROLE_HIERARCHY[role as Role] >= ROLE_HIERARCHY[auth.role as Role]) {
    return NextResponse.json(
      { error: 'Cannot assign a role equal to or higher than your own' },
      { status: 403 }
    );
  }

  const previousRole = targetUser.role;
  targetUser.role = role;
  await targetUser.save();

  await logAudit({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: 'ROLE_CHANGE',
    entityType: 'User',
    entityId: userId,
    metadata: { previousRole, newRole: role },
  });

  return NextResponse.json({
    user: {
      id: targetUser._id,
      username: targetUser.username,
      role: targetUser.role,
    },
  });
});
