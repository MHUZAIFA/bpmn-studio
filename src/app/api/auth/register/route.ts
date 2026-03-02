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
    const { username, password, organizationName } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase().trim();

    const existing = await User.findOne({ username: normalizedUsername });
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    const orgName = organizationName?.trim() || `${normalizedUsername}-org`;
    let org = await Organization.findOne({ name: orgName });
    if (!org) {
      org = await Organization.create({ name: orgName });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username: normalizedUsername,
      passwordHash,
      organizationId: org._id,
      role: Role.OWNER,
    });

    const token = signToken({
      userId: user._id.toString(),
      organizationId: org._id.toString(),
      role: Role.OWNER,
      username: user.username,
    });

    const response = NextResponse.json(
      {
        user: {
          id: user._id,
          username: user.username,
          role: user.role,
          organizationId: org._id,
          organizationName: org.name,
        },
      },
      { status: 201 }
    );
    setTokenCookie(response, token);

    await logAudit({
      organizationId: org._id.toString(),
      userId: user._id.toString(),
      action: 'REGISTER',
      entityType: 'User',
      entityId: user._id.toString(),
      metadata: { organizationName: org.name },
    });

    return response;
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
