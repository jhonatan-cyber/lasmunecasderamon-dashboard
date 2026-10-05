import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { actualizarPermisosDeRol, listarMatrizDeRol } from '@/modules/identidad';

export const GET = withPublicRoute(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const roleId = (await params).id;

    return NextResponse.json({ success: true, data: await listarMatrizDeRol(roleId) });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'roles', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const roleId = (await params).id;
    const body = await request.json();
    const permissionIds = Array.isArray(body?.permissions) ? body.permissions : [];

    await actualizarPermisosDeRol(roleId, permissionIds);

    return NextResponse.json({ success: true, message: 'Permisos del rol actualizados' });
  }
);
