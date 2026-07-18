import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { NotificationService } from '@/lib/services/NotificationService';

export const GET = withRoute({ auth: true, audit: true }, async (_request: Request, { user }: { params: any; user: any }) => {
  const notifications = await NotificationService.getPending(user.id.toString());
  return NextResponse.json({ success: true, data: notifications });
});
