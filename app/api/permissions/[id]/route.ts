import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { PermissionService } from '@/lib/services/PermissionService';

export const PUT = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await PermissionService.update(id, body);
    return NextResponse.json({ success: true, message: 'Permiso actualizado' });
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'delete' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await PermissionService.delete(id);
    return NextResponse.json({ success: true, message: 'Permiso eliminado' });
  }
);
