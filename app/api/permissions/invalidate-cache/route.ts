import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { PermissionsCache } from '@/lib/auth/permissions-cache';

// Solo admins pueden invalidar el caché de permisos
export const POST = withAppAuth(
  async (_request: Request, { user }: { params: any; user: { id: string; role?: string } }) => {
    if (user.role?.toLowerCase() !== 'administrador') {
      return NextResponse.json(
        { success: false, message: 'Solo administradores' },
        { status: 403 }
      );
    }

    PermissionsCache.clear();

    return NextResponse.json({
      success: true,
      message:
        'Caché de permisos invalidado. Los usuarios verán sus nuevos permisos en el próximo request.'
    });
  }
);
