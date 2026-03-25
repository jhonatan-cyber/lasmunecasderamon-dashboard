import { NextResponse } from 'next/server';
import { EventRepository } from '@/lib/repositories/EventRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const data = await EventRepository.getStats(user.id.toString());
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting event stats', error: error.message }, { status: 500 });
  }
}
