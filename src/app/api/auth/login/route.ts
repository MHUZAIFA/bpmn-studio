import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { connectDB } from '@/lib/db/mongoose';
import { User } from '@/models/User';
import { Organization } from '@/models/Organization';
import { signToken, setTokenCookie } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { Role } from '@/types';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: normalizedUsername });

    if (!user) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = signToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role as Role,
      username: user.username,
    });

    const org = await Organization.findById(user.organizationId);

    const response = NextResponse.json({
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: org?.name,
      },
    });
    setTokenCookie(response, token);

    await logAudit({
      organizationId: user.organizationId.toString(),
      userId: user._id.toString(),
      action: 'LOGIN',
      entityType: 'User',
      entityId: user._id.toString(),
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
