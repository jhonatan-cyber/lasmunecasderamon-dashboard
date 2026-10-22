import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
import { ApiResponse } from '@/lib/api/api-response';
import { listarEntradas, registrarEntrada } from '@/modules/entradas';
import { AppError, ValidationError } from '@/lib/errors/errors';

type JsonRecord = Record<string, unknown>;

export const GET = withRoute({ auth: true, module: 'entradas', action: 'view' }, async request => {
  const fecha = new URL(request.url).searchParams.get('fecha') || undefined;
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new ValidationError('La fecha debe tener formato AAAA-MM-DD');
  return NextResponse.json({ success: true, data: await listarEntradas(fecha) });
});

/**
 * Registro en la puerta.
 *
 * El garzón sólo cobra la entrada: el payload no lleva bebidas ni adicionales
 * porque el cliente los elige en la barra. El servidor calcula el total desde
 * `costo_entrada`; si el cliente manda `monto_entrada` se valida contra la
 * configuración (defensa en profundidad).
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'create' },
  async (request, { user }) => {
    const body = (await request.json()) as JsonRecord;
    return runIdempotent(
      request,
      { endpoint: 'entradas.create', usuarioId: String(user.id) },
      async () => {
        try {
          const result = await registrarEntrada({
            clienteNombre: String(body.cliente_nombre || ''),
            montoEntrada:
              body.monto_entrada === undefined || body.monto_entrada === null
                ? undefined
                : Number(body.monto_entrada),
            cantidadEntradas: Number(body.cantidad_entradas ?? 1),
            metodoPago: String(body.metodo_pago || 'efectivo'),
            fecha: String(body.fecha || ''),
            hora: String(body.hora || ''),
            registradoPor: user.id
          });
          return NextResponse.json({ success: true, data: result });
        } catch (error) {
          if (error instanceof AppError) return ApiResponse.error(error);
          throw error;
        }
      }
    );
  }
);
