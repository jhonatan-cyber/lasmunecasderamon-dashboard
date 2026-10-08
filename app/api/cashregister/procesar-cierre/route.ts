import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { CajaProcesarCierreSchema } from '@/lib/business/schemas/caja';
import { validateOrResponse } from '@/lib/api/validate';
import { CashRegisterService } from '@/modules/caja';

/**
 * El administrador resuelve la solicitud desde el link del WhatsApp.
 *
 * `confirmar` cierra la caja descontando del efectivo los saldos que los clientes
 * todavía tienen cargados; `rechazar` la deja abierta. La fila de la solicitud se
 * reclama con `FOR UPDATE` dentro de una transacción, así que dos toques seguidos
 * del link no cierran la caja dos veces.
 */
export const POST = withPublicRoute(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const validated = validateOrResponse(CajaProcesarCierreSchema, body);
  if (validated instanceof NextResponse) return validated;

  const resultado = await CashRegisterService.procesarCierreCaja({
    token: validated.token,
    action: validated.action,
    usuarioId: null,
    // Sin sesión: quién autorizó se registra por este nombre en la solicitud.
    resueltoPor: 'Administrador (link de WhatsApp)'
  });

  return NextResponse.json({
    success: true,
    estado: resultado.estado,
    message:
      resultado.estado === 'aprobada' ? 'Cierre de caja autorizado' : 'Cierre de caja rechazado',
    data: resultado.caja,
    saldo_clientes_descontado: resultado.saldo_clientes_descontado,
    saldo_clientes_por_devolver: resultado.saldo_clientes_por_devolver
  });
});
