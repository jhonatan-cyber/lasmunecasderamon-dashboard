import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ValidationError } from '@/lib/errors/errors';
import { entregaGrupoCoverSchema } from '@/lib/business/schemas/entrada-cover';
import { entregarGrupoEntradas, obtenerSolicitudCover } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (_request, { params, user }) => {
    const { id } = await params;
    const solicitud = await obtenerSolicitudCover(id);
    if (!solicitud) throw new ValidationError('La solicitud ya no existe');
    const body = entregaGrupoCoverSchema.parse({
      entrada_ids:
        typeof solicitud.entrada_ids === 'string'
          ? JSON.parse(solicitud.entrada_ids)
          : solicitud.entrada_ids,
      unidades:
        typeof solicitud.unidades === 'string'
          ? JSON.parse(solicitud.unidades)
          : solicitud.unidades,
      monto_adicional: Number(solicitud.monto_total)
    });
    const data = await entregarGrupoEntradas(
      {
        entradaIds: body.entrada_ids,
        unidades: body.unidades,
        montoAdicional: body.monto_adicional,
        usuarioId: user.id,
        solicitudId: id
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
        const ventaId = venta?.id ?? venta?.id_venta;
        return { ventaId: ventaId ? String(ventaId) : null };
      }
    );
    for (const entradaId of body.entrada_ids) {
      notificarEntradaActualizada({
        entradaId,
        accion: 'entregada',
        clienteNombre: solicitud.cliente_nombre,
        tipo: body.monto_adicional > 0 ? 'upgrade' : 'cover',
        montoCobrarBarra: data.montoCobrarBarra,
        entregadaPorNombre: `${user.name} ${user.lastName}`.trim()
      });
    }
    return NextResponse.json({ success: true, data });
  }
);
