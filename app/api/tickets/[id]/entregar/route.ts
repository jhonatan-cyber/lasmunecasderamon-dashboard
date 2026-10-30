import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { entregarEntrada } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { AppError, ValidationError } from '@/lib/errors/errors';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';

type JsonRecord = Record<string, unknown>;

/**
 * Entrega de la bebida en la barra.
 *
 * El módulo decide cortesía o adicional; cuando es adicional arma el plan y esta
 * ruta registra la venta con `SaleService` (§5: la orquestación entre módulos
 * vive en el adaptador HTTP) con el mismo contexto transaccional.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { params, user }) => {
    const id = (await params).id;
    if (!id) throw new ValidationError('Indica la entrada a entregar');
    const body = (await request.json().catch(() => ({}))) as JsonRecord;
    try {
      // El mostrador puede ajustar lo que paga el cliente en la barra; sin valor
      // el módulo deriva la diferencia por precio.
      const montoAdicional = body.monto_adicional == null ? null : Number(body.monto_adicional);
      if (montoAdicional !== null && !Number.isFinite(montoAdicional))
        throw new ValidationError('Indica un monto adicional válido');
      const data = await entregarEntrada(
        {
          entradaId: id,
          presentacionId: String(body.presentacion_id || ''),
          acompanamientoPresentacionId: body.acompanamiento_presentacion_id
            ? String(body.acompanamiento_presentacion_id)
            : null,
          montoAdicional,
          // El cliente Expo entrega cortes; la web mantiene la botella histórica.
          tipoEntrega: body.tipo_entrega === 'corte' ? 'corte' : 'botella',
          usuarioId: user.id
        },
        async (plan, contexto, asignarTarea) => {
          const venta = await SaleService.createSale(
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
            { contexto, entradaId: plan.entradaId, onAfterCommit: asignarTarea }
          );
          const ventaId = venta?.id ?? venta?.id_venta ?? null;
          return { ventaId: ventaId ? String(ventaId) : null };
        }
      );
      // La puerta y la caja ven el cambio de estado sin recargar.
      notificarEntradaActualizada({
        entradaId: id,
        accion: 'entregada',
        clienteNombre: null,
        tipo: data.tipo,
        montoCobrarBarra: data.montoCobrarBarra,
        entregadaPorNombre: `${user.name} ${user.lastName}`.trim()
      });
      return NextResponse.json({ success: true, data });
    } catch (error) {
      if (error instanceof AppError) return ApiResponse.error(error);
      throw error;
    }
  }
);
