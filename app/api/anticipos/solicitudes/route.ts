import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async () => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  // Get all pending requests (estado = 2 = pendiente)
  const solicitudes = await query(`
    SELECT A.*, CONCAT(U.nombre, ' ', U.apellido) AS usuario_nombre, U.nick
    FROM anticipos A
    INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
    WHERE A.estado = 2
    ORDER BY A.fecha_crea DESC
  `);

  return NextResponse.json({ success: true, data: solicitudes });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const { monto, motivo } = body;

  if (!monto || !motivo) {
    return NextResponse.json(
      { success: false, message: 'monto y motivo son requeridos' },
      { status: 400 }
    );
  }

  try {
    const result = await AnticipoRepository.request(user.id.toString(), Number(monto), motivo);
    return NextResponse.json(
      { success: true, message: 'Solicitud enviada', data: result },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
});

// Helper para query
import { query } from '@/lib/database/db';
