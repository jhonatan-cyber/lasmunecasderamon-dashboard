import { NextResponse } from 'next/server';
import { runIdempotent } from '@/lib/api/idempotency';
import { withRoute } from '@/lib/api/withRoute';
import { AccountService } from '@/modules/operacion';

export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { params, user }) =>
    runIdempotent(
      request,
      { endpoint: 'cuentas.cobrar', usuarioId: user?.id ?? null },
      async () => {
        const id = (await params).id;
        const body = await request.json();

        const normalizedBody = {
          metodoPago: body.metodoPago ?? body.metodo_pago,
          tipoPago: body.tipoPago ?? body.metodo_pago,
          montoFinal: body.montoFinal ?? body.total_cobrado ?? 0,
          propinaFinal: body.propinaFinal ?? body.propina ?? 0,
          habitacion_id: body.habitacion_id ?? null
        };

        await AccountService.cobrar(id, normalizedBody, user.id);
        return NextResponse.json({ success: true, message: 'Cuenta cobrada exitosamente' });
      }
    )
);
