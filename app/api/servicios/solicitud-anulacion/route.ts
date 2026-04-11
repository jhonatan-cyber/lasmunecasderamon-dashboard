import { NextResponse } from 'next/server';
import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { logger } from '@/lib/utils/logger';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');

  if (!token) {
    return NextResponse.json({ success: false, message: 'Token invalido' }, { status: 400 });
  }

  const rows = await query<any[]>(
    `SELECT sas.id, sas.token, sas.estado, sas.motivo, sas.solicitado_por, sas.fecha_solicitud,
            s.id_servicio as servicio_id, s.codigo, s.total, s.tiempo,
            COALESCE(c.nombre, 'Sin cliente registrado') as cliente_nombre,
            COALESCE(h.nombre, 'Sin habitacion') as habitacion_numero
     FROM solicitudes_anulacion_servicios sas
     INNER JOIN servicios s ON s.id_servicio = sas.servicio_id
     LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
     LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
     WHERE BINARY sas.token = BINARY ? AND sas.estado = 'pendiente'
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { servicioId, motivo } = body;

    if (!servicioId || !motivo) {
      return NextResponse.json(
        { success: false, message: 'Faltan datos requeridos' },
        { status: 400 }
      );
    }

    const now = getNowInBusinessTimezone();
    const token = generateUUID();

    await query(
      `INSERT INTO solicitudes_anulacion_servicios (id, token, servicio_id, motivo, solicitado_por, fecha_solicitud, estado)
       VALUES (?, ?, ?, ?, NULL, ?, 'pendiente')`,
      [generateUUID(), token, Number(servicioId), motivo, now]
    );

    return NextResponse.json({ success: true, token });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Error desconocido';
    logger.error('Error al solicitar anulación:', { error });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
