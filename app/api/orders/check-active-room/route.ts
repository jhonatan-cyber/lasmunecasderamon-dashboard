import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

export const POST = withAppApiWrapper(async (request: Request) => {
  const { anfitrionasIds } = await request.json();
  if (!anfitrionasIds || !Array.isArray(anfitrionasIds) || anfitrionasIds.length === 0) {
    return NextResponse.json({ success: true, hasActiveRoom: false });
  }

  const result = await query<any[]>(
    `
      SELECT v.habitacion_id as habitacionId, h.nombre as habitacionNombre, v.tiempo, vu.usuario_id as anfitrionaId
      FROM ventas v
      INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE vu.usuario_id IN (?) AND v.habitacion_id IS NOT NULL AND v.tiempo > 0 AND v.estado = 2
      ORDER BY v.fecha_crea DESC LIMIT 1
    `,
    [anfitrionasIds]
  );

  if (result.length > 0) {
    return NextResponse.json({
      success: true,
      hasActiveRoom: true,
      data: result[0]
    });
  }

  return NextResponse.json({ success: true, hasActiveRoom: false });
});
