import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';

export const GET = withPublicRoute(async () => {
  const { data } = await UserService.getAll({ anfitrionas: '1', status: 'active', loggedIn: true });
  return NextResponse.json({ success: true, data });
});
