import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { crearSolicitudCortesia, listarSolicitudesCortesia } from '@/modules/entradas';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute(
  { auth: true, module: 'entradas', action: 'deliver' },
  async (request: Request) => {
    const estado = new URL(request.url).searchParams.get('estado') || 'pendiente';
    const rows = await listarSolicitudesCortesia(estado);
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

    const id = await crearSolicitudCortesia(
      {
        grupoRegistroId: body.grupo_registro_id || null,
        clienteNombre: body.cliente_nombre || null,
        entradaIds,
        unidades,
        montoTotal: Number(body.monto_total || 0)
      },
      user.id
    );
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  }
);
