import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { PermissionService } from '@/lib/services/PermissionService';

export const GET = withAppApiWrapper(async () => {
  const data = await PermissionService.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  const id = await PermissionService.create(body);
  return NextResponse.json({ success: true, id }, { status: 201 });
});
