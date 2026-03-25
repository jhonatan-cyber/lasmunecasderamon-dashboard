import { NextResponse } from 'next/server';
import { NotificationRepository } from '@/lib/repositories/NotificationRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false }, { status: 401 });

    const count = await NotificationRepository.getPendingCount(user.id.toString());
    return NextResponse.json({ success: true, count });
  } catch (error: any) {
    console.error('❌ [NOTIFICATIONS] Error en /api/notifications/pending-count:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
