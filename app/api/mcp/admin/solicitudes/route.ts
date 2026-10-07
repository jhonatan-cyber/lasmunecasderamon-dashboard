import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { administradorActual } from '@/lib/mcp/admin';
import { ejecutarUnaVez } from '@/lib/mcp/idempotencia';
import {
  ComandoSolicitudSchema,
  ConsultaSolicitudesSchema,
  TipoSolicitudSchema
} from '@/lib/mcp/solicitudes-schema';
import {
  consultarSolicitudes,
  detalleSolicitud,
  ejecutarSolicitud,
  limiteAnticipo
} from '@/workflows/mcp-solicitudes';

export const GET = withRoute({ auth: true, access: 'administrator' }, async (request, { user }) => {
  await administradorActual(String(user.id));
  const params = Object.fromEntries(new URL(request.url).searchParams);
  let data;
  if (params.consulta === 'detalle') {
    const entrada = z
      .object({
        consulta: z.literal('detalle'),
        tipo: TipoSolicitudSchema,
        id: z.string().min(1).max(100)
      })
      .strict()
      .parse(params);
    data = await detalleSolicitud(entrada.tipo, entrada.id);
  } else if (params.consulta === 'limite_anticipo') {
    const entrada = z
      .object({ consulta: z.literal('limite_anticipo'), usuario_id: z.string().min(1).max(100) })
      .strict()
      .parse(params);
    data = await limiteAnticipo(entrada.usuario_id);
  } else {
    const entrada = ConsultaSolicitudesSchema.parse(params);
    data = await consultarSolicitudes(entrada.tipo, entrada.limit, entrada.offset);
  }
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request, { user }) => {
    const admin = await administradorActual(String(user.id));
    const comando = ComandoSolicitudSchema.parse(await request.json());
    return ejecutarUnaVez(admin.id, comando.operacion_id, comando, async () => {
      const data = await ejecutarSolicitud(comando, admin);
      const resultado = JSON.parse(
        JSON.stringify(data ?? { completado: true }, (key, value) =>
          key === 'token' || key === 'push_token' ? undefined : value
        )
      );
      return NextResponse.json({ success: true, data: resultado });
    });
  }
);
