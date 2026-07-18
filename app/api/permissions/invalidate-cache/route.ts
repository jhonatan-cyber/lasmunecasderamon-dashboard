import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { PermissionsCache } from '@/lib/auth/permissions-cache';

export const POST = withRoute(
  { auth: true, audit: true },
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
