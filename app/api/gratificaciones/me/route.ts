import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { GratificacionService } from '@/lib/services/GratificacionService';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await GratificacionService.getAll(user.id);
  return NextResponse.json({ success: true, data });
});
