import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 400 });
  }

  const result = await query<any[]>(
    `SELECT A.id_anticipo, A.usuario_id, A.monto, A.motivo, A.estado, A.fecha_crea,
            CONCAT(U.nombre, ' ', U.apellido) AS usuario, U.nick
     FROM anticipos A
     INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
     WHERE A.id_anticipo = ?`,
    [token]
  );

  if (result.length === 0) {
    return NextResponse.json({ success: false, message: 'Solicitud no encontrada' }, { status: 404 });
  }

  const sol = result[0];
  if (sol.estado !== 2) {
    return NextResponse.json({ success: false, message: 'La solicitud ya fue procesada anteriormente' }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    solicitud: {
      id: sol.id_anticipo,
      usuario: sol.usuario,
      nick: sol.nick,
      monto: Number(sol.monto),
      motivo: sol.motivo,
      fecha: sol.fecha_crea
    }
  });
});
