import { NextResponse } from 'next/server';
import { OrderRepository } from '@/lib/repositories/OrderRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const data = await OrderRepository.getByUser(user.id.toString());
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting user orders', error: error.message }, { status: 500 });
  }
}
