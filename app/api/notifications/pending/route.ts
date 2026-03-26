import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user) return NextResponse.json({ success: false }, { status: 401 });

  const notifications = await NotificationRepository.getPending(user.id.toString());
  return NextResponse.json({ success: true, notifications });
});
