import { NextResponse } from 'next/server';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const notifications = await NotificationRepository.getPending(user.id.toString());
    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error en /api/notifications/pending:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
