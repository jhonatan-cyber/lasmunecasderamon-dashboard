import { NextResponse } from 'next/server';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

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
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error en GET /api/notifications:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const { token, deviceType } = await request.json();
    await NotificationRepository.registerToken(user.id.toString(), token, deviceType);
    return NextResponse.json({ success: true, message: 'Token registrado' });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error en POST /api/notifications:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
