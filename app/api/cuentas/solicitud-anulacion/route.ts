import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token invalido' }, { status: 400 });
  }

  const rows = await query<any[]>(
    `SELECT sac.id, sac.estado, sac.motivo, sac.monto, sac.fecha_crea,
            c.id_cuenta as cuenta_id, c.codigo, c.total,
            COALESCE(cl.nombre, 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_cuentas sac
     INNER JOIN cuentas c ON BINARY c.id_cuenta = BINARY sac.cuenta_id
     LEFT JOIN clientes cl ON BINARY cl.id_cliente = BINARY c.cliente_id
     WHERE BINARY sac.id = BINARY ? AND sac.estado = 'pendiente'
     LIMIT 1`,
    [token]
  );

  if (!rows.length) {
    return NextResponse.json(
      { success: false, message: 'Solicitud no encontrada o ya procesada' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, solicitud: rows[0] });
}
