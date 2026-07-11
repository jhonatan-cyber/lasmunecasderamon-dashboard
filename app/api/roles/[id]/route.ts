import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { RoleService } from '@/lib/services/RoleService';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await RoleService.getById(id);
    if (!data)
      return NextResponse.json({ success: false, message: 'Role not found' }, { status: 404 });
    return NextResponse.json({ success: true, data });
  }
);

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();
    await RoleService.updateRole(id, body);
    return NextResponse.json({ success: true, message: 'Role updated' });
  }
);

export const DELETE = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await RoleService.delete(id);
    return NextResponse.json({ success: true, message: 'Role deleted' });
  }
);
