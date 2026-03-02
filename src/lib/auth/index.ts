import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { JWTPayload, AuthenticatedRequest, Role } from '@/types';

const TOKEN_NAME = 'bpmn_token';
const TOKEN_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not defined');
  return secret;
}

export function signToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: TOKEN_MAX_AGE });
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, getJwtSecret()) as JWTPayload;
}

export function setTokenCookie(response: NextResponse, token: string): void {
  response.cookies.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: TOKEN_MAX_AGE,
    path: '/',
  });
}

export function clearTokenCookie(response: NextResponse): void {
  response.cookies.set(TOKEN_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(TOKEN_NAME)?.value ?? null;
}

export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(TOKEN_NAME)?.value ?? null;
}

export function extractAuth(req: NextRequest): AuthenticatedRequest | null {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return {
      userId: payload.userId,
      organizationId: payload.organizationId,
      role: payload.role as Role,
      username: payload.username,
    };
  } catch {
    return null;
  }
}
