import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { PermissionService } from '@/lib/services/PermissionService';

export const GET = withPublicRoute(async () => {
  const data = await PermissionService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request) => {
    const body = await request.json();
    const id = await PermissionService.create(body);
    return NextResponse.json({ success: true, id }, { status: 201 });
  }
);
