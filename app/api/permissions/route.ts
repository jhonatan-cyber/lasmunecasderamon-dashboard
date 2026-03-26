import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { PermissionRepository } from '@/lib/repositories/PermissionRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await PermissionRepository.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  const id = await PermissionRepository.create(body);
  return NextResponse.json({ success: true, id }, { status: 201 });
});
