import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { validateOrResponse } from '@/lib/api/validate';
import { CajaSolicitarCierreSchema } from '@/lib/business/schemas/caja';
import { respuestaCierreCaja, solicitarOProcesarCierreCaja } from '@/lib/api/cierreCaja';

/**
 * Cierre de caja con autorización del administrador.
 *
 * El administrador cierra en el acto; cualquier otro rol genera una solicitud y el
 * link de autorización le llega por WhatsApp. La caja sigue abierta hasta que el
 * administrador responda. Ver `lib/api/cierreCaja.ts`.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { user }) => {
    const body = await request.json();
    const validated = validateOrResponse(CajaSolicitarCierreSchema, body);
    if (validated instanceof NextResponse) return validated;

    const resultado = await solicitarOProcesarCierreCaja({
      user,
      id_caja: validated.id_caja,
      motivo: validated.motivo ?? null
    });

    return NextResponse.json(respuestaCierreCaja(resultado), {
      status: resultado.httpStatus
    });
  }
);
