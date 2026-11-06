import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { params, user }) => {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const motivo = String(body.motivo || '').trim();
    if (!motivo) throw new ValidationError('Indica el motivo del rechazo');
    const filas = await query<any[]>(
      `SELECT estado FROM solicitudes_entrega_cortesias WHERE id = ? FOR UPDATE`,
      [id]
    );
    if (!filas.length) throw new ValidationError('La solicitud ya no existe');
    if (filas[0].estado !== 'pendiente')
      throw new ValidationError('La solicitud ya fue respondida');
    await query(
      `UPDATE solicitudes_entrega_cortesias
          SET estado = 'rechazada', autorizado_por = ?, motivo_rechazo = ?, fecha_respuesta = ?
        WHERE id = ?`,
      [user.id, motivo, getNowInBusinessTimezone(), id]
    );
    return NextResponse.json({ success: true });
  }
);
