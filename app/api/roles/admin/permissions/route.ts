import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { RoleRepository } from '@/lib/repositories/RoleRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await RoleRepository.getAdminPermissions();
  return NextResponse.json({ success: true, data });
});
