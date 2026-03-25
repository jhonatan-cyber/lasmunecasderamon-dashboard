import { NextResponse } from 'next/server';
import { OvertimeRepository } from '@/lib/repositories/OvertimeRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const userIdInQuery = searchParams.get('userId');

    // Policy: only admins can see others, non-admins see only theirs
    const isAdmin = userAuth.role === 'administrador';
    const targetUserId = isAdmin ? (userIdInQuery || undefined) : userAuth.id;

    const data = await OvertimeRepository.getAll(targetUserId);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { usuario_id, hora, monto } = await request.json();
    if (!usuario_id || !hora || !monto) return NextResponse.json({ success: false, message: 'Todos los campos son requeridos' }, { status: 400 });

    const id = await OvertimeRepository.create({ usuario_id, hora, monto });
    return NextResponse.json({ success: true, message: 'Hora extra creada exitosamente', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear la hora extra', error: error.message }, { status: 500 });
  }
}
