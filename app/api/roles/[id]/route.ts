import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { RoleService } from '@/lib/services/RoleService';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await RoleService.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const PUT = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await RoleService.updateRole(id, body);
    // Un rol renombrado cambia lo que sus miembros pueden hacer.
    sendNotificationToAll('permissions-updated', { roleId: id });
    return NextResponse.json({ success: true, message: 'Role updated' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'users', action: 'delete' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await RoleService.delete(id);
    // El payload lleva el roleId: quien lo tenía ve el aviso y es redirigido al login.
    sendNotificationToAll('role-deleted', { roleId: id });
    return NextResponse.json({ success: true, message: 'Role deleted' });
  }
);
