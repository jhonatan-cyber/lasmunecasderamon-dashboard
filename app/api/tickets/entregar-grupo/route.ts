import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { entregaGrupoCoverSchema } from '@/lib/business/schemas/entrada-cover';
import { entregarGrupoEntradas } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';

export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { user }) => {
    const body = entregaGrupoCoverSchema.parse(await request.json());
    const data = await entregarGrupoEntradas(
      {
        entradaIds: body.entrada_ids,
        unidades: body.unidades,
        montoAdicional: body.monto_adicional,
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
        const ventaId = venta?.id ?? venta?.id_venta;
        return { ventaId: ventaId ? String(ventaId) : null };
      }
    );
    for (const entradaId of body.entrada_ids) {
      notificarEntradaActualizada({
        entradaId,
        accion: 'entregada',
        clienteNombre: null,
        tipo: body.monto_adicional > 0 ? 'upgrade' : 'cover',
        montoCobrarBarra: data.montoCobrarBarra,
        entregadaPorNombre: `${user.name} ${user.lastName}`.trim()
      });
    }
    return NextResponse.json({ success: true, data });
  }
);
