import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { runIdempotent } from '@/lib/api/idempotency';
import { ApiResponse } from '@/lib/api/api-response';
import { listarEntradas, registrarEntrada } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { AppError, ValidationError } from '@/lib/errors/errors';

type JsonRecord = Record<string, unknown>;

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async request => {
  const fecha = new URL(request.url).searchParams.get('fecha') || undefined;
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new ValidationError('La fecha debe tener formato AAAA-MM-DD');
  return NextResponse.json({ success: true, data: await listarEntradas(fecha) });
});

/**
 * Productos de cortesía del payload.
 *
 * El formato nuevo manda `productos_cortesia`; el antiguo mandaba una sola
 * bebida para todas las entradas (`bebida_cortesia_presentacion_id`), que aquí
 * se expande a la cantidad de entradas del grupo.
 */
function normalizarProductos(body: JsonRecord, cantidadEntradas: number) {
  if (Array.isArray(body.productos_cortesia) && body.productos_cortesia.length > 0)
    return body.productos_cortesia.map((item: JsonRecord) => ({
      presentacionId: String(item.presentacionId || item.presentacion_id || ''),
      cantidad: Number(item.cantidad),
      acompanamientoPresentacionId:
        item.acompanamientoId || item.acompanamiento_presentacion_id
          ? String(item.acompanamientoId || item.acompanamiento_presentacion_id)
          : null
    }));

  if (!Number(body.monto_bebida_adicional || 0) && body.bebida_cortesia_presentacion_id)
    return [
      {
        presentacionId: String(body.bebida_cortesia_presentacion_id),
        cantidad: cantidadEntradas,
        acompanamientoPresentacionId: body.bebida_acompanamiento_presentacion_id
          ? String(body.bebida_acompanamiento_presentacion_id)
          : null
      }
    ];

  return [];
}

/**
 * Partes del grupo (una fila por entrada).
 *
 * El formato nuevo manda `partes`; el antiguo mandaba `cantidad_entradas` y
 * `monto_bebida_adicional` sueltos. Antes el payload antiguo armaba una sola
 * parte y guardaba el total del grupo en una fila; ahora se expande igual que
 * el formulario actual, con el adicional en la primera entrada.
 */
function normalizarPartes(body: JsonRecord, cantidadEntradas: number) {
  if (Array.isArray(body.partes) && body.partes.length > 0)
    return body.partes.map((parte: JsonRecord) => ({
      montoBebidaAdicional: Number(parte.monto_bebida_adicional || 0),
      bebidaCortesiaPresentacionId: parte.bebida_cortesia_presentacion_id
        ? String(parte.bebida_cortesia_presentacion_id)
        : null,
      bebidaAcompanamientoPresentacionId: parte.bebida_acompanamiento_presentacion_id
        ? String(parte.bebida_acompanamiento_presentacion_id)
        : null
    }));

  const adicional = Number(body.monto_bebida_adicional || 0);
  return Array.from({ length: cantidadEntradas }, (_, index) => ({
    montoBebidaAdicional: index === 0 ? adicional : 0,
    bebidaCortesiaPresentacionId:
      index === 0 && body.bebida_cortesia_presentacion_id
        ? String(body.bebida_cortesia_presentacion_id)
        : null,
    bebidaAcompanamientoPresentacionId:
      index === 0 && body.bebida_acompanamiento_presentacion_id
        ? String(body.bebida_acompanamiento_presentacion_id)
        : null
  }));
}

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request, { user }) => {
    const body = (await request.json()) as JsonRecord;
    const partesEnviadas = Array.isArray(body.partes) ? body.partes : [];
    const cantidadEntradas =
      partesEnviadas.length || Math.max(1, Math.floor(Number(body.cantidad_entradas) || 1));

    return runIdempotent(
      request,
      { endpoint: 'entradas.create', usuarioId: String(user.id) },
      async () => {
        try {
          const result = await registrarEntrada(
            {
              clienteNombre: String(body.cliente_nombre || ''),
              montoEntrada: Number(body.monto_entrada),
              metodoPago: String(body.metodo_pago || 'efectivo'),
              productosCortesia: normalizarProductos(body, cantidadEntradas),
              fecha: String(body.fecha || ''),
              hora: String(body.hora || ''),
              registradoPor: user.id,
              partes: normalizarPartes(body, cantidadEntradas)
            },
            // El módulo arma el plan de cortesía; la venta se registra aquí (§5:
            // la orquestación entre módulos vive en el adaptador HTTP) con el
            // mismo contexto transaccional.
            async (plan, contexto, asignarTarea) => {
              await SaleService.createSale(
                {
                  total: plan.totalVenta,
                  sub_total: plan.totalVenta,
                  total_comision: 0,
                  metodo_pago: plan.metodoPago,
                  propina: 0,
                  tiempo: 0,
                  usuarios: [],
                  detalles: plan.detalles as never
                },
                plan.usuarioId,
                {
                  contexto,
                  entradaId: plan.entradaId,
                  onAfterCommit: asignarTarea
                }
              );
            }
          );
          return NextResponse.json({ success: true, data: result });
        } catch (error) {
          if (error instanceof AppError) return ApiResponse.error(error);
          throw error;
        }
      }
    );
  }
);
