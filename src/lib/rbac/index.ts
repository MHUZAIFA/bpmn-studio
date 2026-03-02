import { NextRequest, NextResponse } from 'next/server';
import { Role, ROLE_HIERARCHY, AuthenticatedRequest } from '@/types';
import { extractAuth } from '@/lib/auth';

export function hasMinimumRole(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

export type RouteHandler = (
  req: NextRequest,
  auth: AuthenticatedRequest
) => Promise<NextResponse>;

export function requireAuth(handler: RouteHandler) {
  return async (req: NextRequest) => {
    const auth = extractAuth(req);
    if (!auth) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    return handler(req, auth);
  };
}

export function requireRole(minimumRole: Role, handler: RouteHandler) {
  return requireAuth(async (req, auth) => {
    if (!hasMinimumRole(auth.role, minimumRole)) {
      return NextResponse.json(
        { error: `Requires ${minimumRole} role or higher` },
        { status: 403 }
      );
    }
    return handler(req, auth);
  });
}
