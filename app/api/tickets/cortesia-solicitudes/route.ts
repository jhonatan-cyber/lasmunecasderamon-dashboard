import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query, generateUUID } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const GET = withRoute(
  { auth: true, module: 'entradas', action: 'deliver' },
  async (request: Request) => {
    const estado = new URL(request.url).searchParams.get('estado') || 'pendiente';
    const rows = await query<any[]>(
      `SELECT s.*, u.nick AS solicitado_por_nick
         FROM solicitudes_entrega_cortesias s
         LEFT JOIN usuarios u ON u.id_usuario::text = s.solicitado_por::text
        WHERE s.estado = ?
        ORDER BY s.fecha_solicitud DESC`,
      [estado]
    );
    return NextResponse.json({ success: true, data: rows });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { user }) => {
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const unidades = Array.isArray(body.unidades) ? body.unidades : [];
    const entradaIds = Array.isArray(body.entrada_ids) ? body.entrada_ids : [];
    if (!unidades.length || unidades.length > entradaIds.length)
      throw new ValidationError('Selecciona al menos una cortesía y sus entradas');

    for (const unidad of unidades) {
      if (!unidad.entrada_id || !unidad.presentacion_id)
        throw new ValidationError('Cada cortesía necesita entrada y producto');
    }

    const id = generateUUID();
    await query(
      `INSERT INTO solicitudes_entrega_cortesias
       (id, grupo_registro_id, cliente_nombre, entrada_ids, unidades, monto_total, solicitado_por, estado, fecha_solicitud)
       VALUES (?, ?, ?, ?::jsonb, ?::jsonb, ?, ?, 'pendiente', ?)`,
      [
        id,
        body.grupo_registro_id || null,
        body.cliente_nombre || null,
        JSON.stringify(entradaIds),
        JSON.stringify(unidades),
        Number(body.monto_total || 0),
        user.id,
        getNowInBusinessTimezone()
      ]
    );
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  }
);
