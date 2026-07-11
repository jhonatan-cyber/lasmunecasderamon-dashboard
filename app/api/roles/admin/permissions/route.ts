import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { RoleService } from '@/lib/services/RoleService';

export const GET = withAppApiWrapper(async () => {
  const data = await RoleService.getAdminPermissions();
  return NextResponse.json({ success: true, data });
});
