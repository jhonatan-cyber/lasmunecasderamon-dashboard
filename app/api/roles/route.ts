import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { RoleService } from '@/lib/services/RoleService';

export const GET = withAppApiWrapper(async () => {
  const data = await RoleService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppAuth(async (request: Request) => {
  const body = await request.json();
  const id = await RoleService.create(body);
  return NextResponse.json({ success: true, message: 'Role created', id }, { status: 201 });
});
