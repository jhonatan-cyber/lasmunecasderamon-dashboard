import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';

export const GET = withAppAuth(async (_request: Request, { user }: { params: any; user: any }) => {
  const notifications = await NotificationRepository.getPending(user.id.toString());
  return NextResponse.json({ success: true, notifications });
});
