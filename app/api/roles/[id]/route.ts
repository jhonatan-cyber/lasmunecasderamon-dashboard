import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { RoleService } from '@/modules/identidad';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { RoleWriteSchema } from '@/lib/business/schemas/role';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await RoleService.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

async function actualizarRol(id: string, body: { nombre: string; descripcion: string }) {
  const role = await RoleService.getById(id);
  if (!role)
    return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
  if (
    role.nombre.toLowerCase() === 'administrador' &&
    body.nombre.toLowerCase() !== 'administrador'
  ) {
    return NextResponse.json(
      { success: false, message: 'El rol administrador no se puede renombrar' },
      { status: 409 }
    );
  }
  if (
    role.nombre.toLowerCase() !== 'administrador' &&
    body.nombre.toLowerCase() === 'administrador'
  ) {
    return NextResponse.json(
      { success: false, message: 'Ese nombre de rol está reservado' },
      { status: 409 }
    );
  }
  await RoleService.updateRole(id, body);
  // Un rol renombrado cambia lo que sus miembros pueden hacer.
  sendNotificationToAll('permissions-updated', { roleId: id });
  return NextResponse.json({ success: true, message: 'Role updated' });
}

async function cambiarEstadoRol(id: string, estado: 0 | 1) {
  const role = await RoleService.getById(id);
  if (!role) {
    return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
  }
  if (!estado && role.nombre.toLowerCase() === 'administrador') {
    return NextResponse.json(
      { success: false, message: 'El rol administrador no se puede desactivar' },
      { status: 409 }
    );
  }
  await RoleService.setStatus(id, estado);
  sendNotificationToAll('permissions-updated', { roleId: id });
  return NextResponse.json({ success: true });
}

// El PUT también activa y desactiva: el guard vive en un único `withRoute` (módulo/acción
// del gate) y el conmutador de `?action` solo elige el caso, sin leer el cuerpo JSON en
// las operaciones de estado.
export const PUT = withRoute(
  { auth: true, audit: true, module: 'roles', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const action = new URL(request.url).searchParams.get('action');
    if (action === 'activate') return cambiarEstadoRol(id, 1);
    if (action === 'deactivate') return cambiarEstadoRol(id, 0);
    return actualizarRol(id, RoleWriteSchema.parse(await request.json()));
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'roles', action: 'delete' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const role = await RoleService.getById(id);
    if (!role)
      return NextResponse.json({ success: false, message: 'Rol no encontrado' }, { status: 404 });
    if (
      role.nombre.toLowerCase() === 'administrador' ||
      (await RoleService.getUsersByRole(id)).length
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'No se puede eliminar un rol administrador o con usuarios asignados'
        },
        { status: 409 }
      );
    }
    await RoleService.delete(id);
    // El payload lleva el roleId: quien lo tenía ve el aviso y es redirigido al login.
    sendNotificationToAll('role-deleted', { roleId: id });
    return NextResponse.json({ success: true, message: 'Role deleted' });
  }
);
