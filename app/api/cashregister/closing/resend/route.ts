import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { validateOrResponse } from '@/lib/api/validate';
import { CajaSolicitarCierreSchema } from '@/lib/business/schemas/caja';
import { reenviarAvisoCierreCaja, respuestaReenvioAviso } from '@/lib/api/cierreCaja';

/**
 * Reenvía al administrador el aviso de un cierre de caja que quedó pendiente.
 *
 * No crea una solicitud nueva (el índice único parcial impide dos pendientes del mismo
 * turno): reenvía **la misma**, con su token y su link, y solo si pasó el enfriamiento
 * de un minuto. Ver `lib/api/cierreCaja.ts`.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { user }) => {
    const body = await request.json();
    const validated = validateOrResponse(CajaSolicitarCierreSchema, body);
    if (validated instanceof NextResponse) return validated;

    const resultado = await reenviarAvisoCierreCaja({
      id_caja: validated.id_caja,
      solicitante: user.nick || user.name || String(user.id)
    });

    return NextResponse.json(respuestaReenvioAviso(resultado), {
      status: resultado.httpStatus
    });
  }
);
