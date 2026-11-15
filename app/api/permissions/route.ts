import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { PermissionService } from '@/modules/identidad';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { PermissionCreateSchema } from '@/lib/business/schemas';
import { validateOrResponse } from '@/lib/api/validate';

export const GET = withPublicRoute(async () => {
  const data = await PermissionService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    const validated = validateOrResponse(PermissionCreateSchema, body);
    if (validated instanceof NextResponse) return validated;
    const id = await PermissionService.create(validated);
    // Un permiso nuevo cambia lo que cada rol puede hacer: los clientes refrescan.
    sendNotificationToAll('permissions-updated', { permissionId: id });
    return NextResponse.json({ success: true, id }, { status: 201 });
  }
);
