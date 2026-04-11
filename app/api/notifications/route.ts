import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';

export const GET = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  if (type === 'history') {
    const data = await NotificationRepository.getHistory(user.id.toString());
    return NextResponse.json({ success: true, data });
  } else if (type === 'pending-count') {
    const count = await NotificationRepository.getPendingCount(user.id.toString());
    return NextResponse.json({ success: true, count });
  }

  const data = await NotificationRepository.getPending(user.id.toString());
  return NextResponse.json({ success: true, data });
});

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const { token, deviceType } = await request.json();
  await NotificationRepository.registerToken(user.id.toString(), token, deviceType);
  return NextResponse.json({ success: true, message: 'Token registrado' });
});
