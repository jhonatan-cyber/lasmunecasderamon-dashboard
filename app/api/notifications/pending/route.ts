import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { NotificationService } from '@/lib/services/NotificationService';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const notifications = await NotificationService.getPending(user.id.toString());
  return NextResponse.json({ success: true, notifications });
});
