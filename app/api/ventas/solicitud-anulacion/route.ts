import { NextResponse } from 'next/server';
import { query } from '@/lib/database/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token invalido' }, { status: 400 });
  }

  const rows = await query<any[]>(
    `SELECT sav.id, sav.token, sav.estado, sav.motivo, sav.monto, sav.solicitado_por, sav.fecha_solicitud,
            v.id_venta as venta_id, v.codigo, v.total,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre
     FROM solicitudes_anulacion_ventas sav
     INNER JOIN ventas v ON v.id_venta = sav.venta_id
     LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
     WHERE BINARY sav.token = BINARY ? AND sav.estado = 'pendiente'
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
