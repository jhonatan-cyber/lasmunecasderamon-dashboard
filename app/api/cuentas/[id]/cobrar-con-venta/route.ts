import { NextResponse } from 'next/server';
import { runIdempotent } from '@/lib/api/idempotency';
import { withRoute } from '@/lib/api/withRoute';
import { cobrarCuentaConVenta } from '@/workflows/cobrar-cuenta';

/**
 * Cobro de cuenta + venta de lo consumido, en una sola transacción.
 *
 * `POST /cuentas/:id/cobrar` y `POST /sales` son dos requests: si el segundo no
 * llega, queda una cuenta cobrada sin venta (y con la app encolando sin red, el
 * corte pasa a ser lo normal). Este endpoint hace las dos cosas con el mismo
 * `trx`, así que confirman juntos o revierten juntos, y la app lo manda como
 * UNA sola intención con su `x-idempotency-key`: el reintento replica la
 * respuesta original en vez de cobrar dos veces.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { params, user }) =>
    runIdempotent(
      request,
      { endpoint: 'cuentas.cobrar_con_venta', usuarioId: user?.id ?? null },
      async () => {
        const id = (await params).id;
        const body = await request.json();

        const normalizedBody = {
          metodoPago: body.metodoPago ?? body.metodo_pago,
          tipoPago: body.tipoPago ?? body.metodo_pago,
          montoFinal: body.montoFinal ?? body.total_cobrado ?? 0,
          propinaFinal: body.propinaFinal ?? body.propina ?? 0,
          habitacion_id: body.habitacion_id ?? null,
          // Hora del dispositivo: la venta queda fechada cuando el cajero cobró
          // y no cuando la cola pudo sincronizar, o se movería de turno.
          device_date: body.device_date
        };

        const cuenta = await cobrarCuentaConVenta(id, normalizedBody, user.id);
        return NextResponse.json({
          success: true,
          message: 'Cuenta cobrada y venta registrada',
          data: cuenta
        });
      }
    )
);
