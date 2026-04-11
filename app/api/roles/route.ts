import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { RoleRepository } from '@/lib/repositories/RoleRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await RoleRepository.getAll();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppAuth(async (request: Request) => {
  const body = await request.json();
  const id = await RoleRepository.create(body);
  return NextResponse.json({ success: true, message: 'Role created', id }, { status: 201 });
});
