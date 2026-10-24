import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { PayrollService } from '@/modules/personal';

export const GET = withPublicRoute(async () => {
  const data = await PayrollService.getSummary();
  return NextResponse.json({ success: true, data });
});

/**
 * Paga la planilla pendiente de un trabajador.
 *
 * `total_esperado` es obligatorio: es el total que la lista mostró al operador.
 * El servidor recalcula el saldo dentro de la transacción y lo compara; si
 * cambió (o si no queda nada que pagar) no liquida un monto distinto al que
 * alguien confirmó en pantalla. Los rechazos salen con su mensaje porque
 * `withRoute` devuelve los `AppError` tal cual.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'payroll', action: 'write' },
  async (request: Request, { user }) => {
    const body = await request.json().catch(() => null);
    const usuarioId = typeof body?.usuario_id === 'string' ? body.usuario_id.trim() : '';
    const totalEsperado = Number(body?.total_esperado);

    if (!usuarioId)
      return NextResponse.json(
        { success: false, message: 'usuario_id es requerido' },
        { status: 400 }
      );
    if (body?.total_esperado === undefined || !Number.isFinite(totalEsperado) || totalEsperado < 0)
      return NextResponse.json(
        { success: false, message: 'total_esperado es requerido' },
        { status: 400 }
      );

    const resumen = await PayrollService.pay(usuarioId, String(user.id), totalEsperado);
    return NextResponse.json({
      success: true,
      message: 'Pago procesado correctamente',
      data: { monto: resumen.total, componentes: resumen.componentes }
    });
  }
);
