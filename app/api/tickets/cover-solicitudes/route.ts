import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { crearSolicitudCover, listarSolicitudesCover } from '@/modules/entradas';
import { solicitudCoverSchema } from '@/lib/business/schemas/entrada-cover';

// La lista la leen la barra (para no repetir una solicitud ya enviada) y caja
// (para responderla): ambos roles tienen `entradas.view`.
export const GET = withRoute(
  { auth: true, module: 'entradas', action: 'view' },
  async (request: Request) => {
    const estado = new URL(request.url).searchParams.get('estado') || 'pendiente';
    const rows = await listarSolicitudesCover(estado);
    return NextResponse.json({ success: true, data: rows });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { user }) => {
    const body = solicitudCoverSchema.parse(await request.json());

    const id = await crearSolicitudCover(
      {
        grupoRegistroId: body.grupo_registro_id || null,
        clienteNombre: body.cliente_nombre || null,
        entradaIds: body.entrada_ids,
        unidades: body.unidades,
        montoTotal: body.monto_adicional
      },
      user.id
    );
    return NextResponse.json({ success: true, data: { id } }, { status: 201 });
  }
);
