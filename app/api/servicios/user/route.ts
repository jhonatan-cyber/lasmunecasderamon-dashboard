import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ServiceService } from '@/lib/services/ServiceService';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
  const data = await ServiceService.getByUser(user.id.toString());
  return NextResponse.json({ success: true, data });
});
