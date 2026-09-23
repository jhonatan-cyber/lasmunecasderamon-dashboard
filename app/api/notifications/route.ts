import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { NotificationService } from '@/lib/services/NotificationService';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'history') {
      const data = await NotificationService.getHistory(user.id.toString());
      return NextResponse.json({ success: true, data });
    } else if (type === 'pending-count') {
      const count = await NotificationService.getPendingCount(user.id.toString());
      return NextResponse.json({ success: true, count });
    }

    const data = await NotificationService.getPending(user.id.toString());
    return NextResponse.json({ success: true, data });
  }
);

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { token, deviceType } = await request.json();
    await NotificationService.registerToken(user.id.toString(), token, deviceType);
    return NextResponse.json({ success: true, message: 'Token registrado' });
  }
);
