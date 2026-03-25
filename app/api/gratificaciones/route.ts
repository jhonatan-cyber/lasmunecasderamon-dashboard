import { NextResponse } from 'next/server';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    // Policy: only admins can see others, non-admins see only theirs
    const targetUserId = (user.role === 'administrador') ? (userId || undefined) : user.id;

    const data = await GratificacionRepository.getAll(targetUserId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { usuario_id, monto, descripcion } = await request.json();
    if (!usuario_id || !monto) return NextResponse.json({ success: false, message: 'Usuario y monto son requeridos' }, { status: 400 });

    const id = await GratificacionRepository.create({ usuario_id, monto, descripcion });
    return NextResponse.json({ success: true, message: 'Gratificación creada', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear gratificación', error: error.message }, { status: 500 });
  }
}
