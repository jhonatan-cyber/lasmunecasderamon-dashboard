import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { PermissionService } from '@/modules/identidad';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { PermissionUpdateSchema } from '@/lib/business/schemas';
import { validateOrResponse } from '@/lib/api/validate';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    const validated = validateOrResponse(PermissionUpdateSchema, body);
    if (validated instanceof NextResponse) return validated;
    await PermissionService.update(id, validated);
    // Los clientes con ese permiso en caché deben volver a pedirlo.
    sendNotificationToAll('permissions-updated', { permissionId: id });
    return NextResponse.json({ success: true, message: 'Permiso actualizado' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await PermissionService.delete(id);
    sendNotificationToAll('permissions-updated', { permissionId: id });
    return NextResponse.json({ success: true, message: 'Permiso eliminado' });
  }
);
