import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { RoleService } from '@/lib/services/RoleService';

export const GET = withPublicRoute(async () => {
  const data = await RoleService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'roles', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    const id = await RoleService.create(body);
    return NextResponse.json({ success: true, message: 'Role created', id }, { status: 201 });
  }
);
