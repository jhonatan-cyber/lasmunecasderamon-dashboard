import { NextResponse } from 'next/server';
import { AuthRepository } from '@/lib/repositories/AuthRepository';
import { cookies } from 'next/headers';
import { getAuth } from '@/lib/auth-app';

export async function POST() {
  try {
    const user = await getAuth();
    if (user) await AuthRepository.logout(user.id);

    const cookieStore = await cookies();
    cookieStore.delete('token');

    return NextResponse.json({ success: true, message: 'Sesión cerrada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al cerrar sesión', error: error.message }, { status: 500 });
  }
}
