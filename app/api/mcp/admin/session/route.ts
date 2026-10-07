import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { administradorActual } from '@/lib/mcp/admin';

export const GET = withRoute(
  { auth: true, access: 'administrator' },
  async (_request, { user }) => {
    return NextResponse.json({ success: true, data: await administradorActual(String(user.id)) });
  }
);
