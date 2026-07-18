import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { RoleService } from '@/lib/services/RoleService';

export const GET = withPublicRoute(async () => {
  const data = await RoleService.getAdminPermissions();
  return NextResponse.json({ success: true, data });
});
