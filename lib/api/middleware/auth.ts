import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractToken, AuthenticatedUser } from '@/lib/auth/auth';
import { AppError } from '@/lib/errors/errors';

export interface AuthContext {
  user: AuthenticatedUser;
}

export type ApiHandler = (request: NextRequest, context: AuthContext) => Promise<NextResponse>;

export async function withAuth(
  handler: ApiHandler,
  options?: {
    requireRoles?: string[];
  }
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      const token = extractToken(request as any);

      if (!token) {
        return NextResponse.json(
          {
            success: false,
            message: 'Token de autenticación requerido',
            error: { code: 'NO_TOKEN' }
          },
          { status: 401 }
        );
      }

      const user = verifyToken(token);

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            message: 'Token inválido o expirado',
            error: { code: 'INVALID_TOKEN' }
          },
          { status: 401 }
        );
      }

      if (options?.requireRoles?.length) {
        const userRole = user.role.toLowerCase();
        const hasRole = options.requireRoles.some(r => r.toLowerCase() === userRole);

        if (!hasRole) {
          return NextResponse.json(
            {
              success: false,
              message: 'No tienes permisos para esta acción',
              error: { code: 'FORBIDDEN' }
            },
            { status: 403 }
          );
        }
      }

      return handler(request, { user });
    } catch (error) {
      if (error instanceof AppError) {
        return NextResponse.json(
          { success: false, message: error.message, error: { code: error.code } },
          { status: error.statusCode }
        );
      }

      return NextResponse.json(
        {
          success: false,
          message: 'Error interno del servidor',
          error: { code: 'INTERNAL_ERROR' }
        },
        { status: 500 }
      );
    }
  };
}

export function requireAuth() {
  return async (request: NextRequest): Promise<AuthenticatedUser> => {
    const token = extractToken(request as any);

    if (!token) {
      throw new AppError('Token de autenticación requerido', 'NO_TOKEN', 401);
    }

    const user = verifyToken(token);

    if (!user) {
      throw new AppError('Token inválido o expirado', 'INVALID_TOKEN', 401);
    }

    return user;
  };
}

export function requireRoles(roles: string[]) {
  return async (user: AuthenticatedUser): Promise<void> => {
    const userRole = user.role.toLowerCase();
    const hasRole = roles.some(r => r.toLowerCase() === userRole);

    if (!hasRole) {
      throw new AppError('No tienes permisos para esta acción', 'FORBIDDEN', 403);
    }
  };
}
