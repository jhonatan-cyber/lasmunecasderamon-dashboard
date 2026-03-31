import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { PermissionRepository } from '@/lib/repositories/PermissionRepository';

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await PermissionRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Permiso actualizado' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await PermissionRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Permiso eliminado' });
  }
);