import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { PermissionService } from '@/lib/services/PermissionService';

export const PUT = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await PermissionService.update(id, body);
    return NextResponse.json({ success: true, message: 'Permiso actualizado' });
  }
);

export const DELETE = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await PermissionService.delete(id);
    return NextResponse.json({ success: true, message: 'Permiso eliminado' });
  }
);
