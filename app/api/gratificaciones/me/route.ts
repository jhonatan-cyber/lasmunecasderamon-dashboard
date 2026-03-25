import { NextResponse } from 'next/server';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const data = await GratificacionRepository.getAll(user.id);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}
