import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { entregaCoverSchema } from '@/lib/business/schemas/entrada-cover';
import { entregarGrupoEntradas, type RegistradorVenta } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';

export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { user }) => {
    const body = entregaCoverSchema.parse(await request.json());
    const registrarVenta: RegistradorVenta = async (plan, contexto, asignarTarea) => {
      const venta = await SaleService.createSale(
        {
          total: plan.totalVenta,
          sub_total: plan.totalVenta,
          total_comision: 0,
          metodo_pago: plan.metodoPago,
          propina: 0,
          tiempo: 0,
          usuarios: plan.anfitrionas ?? [],
          habitacion_id: plan.habitacionId ?? null,
          detalles: plan.detalles as never
        },
        plan.usuarioId,
        { contexto, entradaId: plan.entradaId, onAfterCommit: asignarTarea }
      );
      const ventaId = venta?.id ?? venta?.id_venta;
      return { ventaId: ventaId ? String(ventaId) : null };
    };

    if ('entregas' in body) {
      const entregas = body.entregas.map(entrega => ({
        entradaId: entrega.entrada_id,
        unidades: entrega.unidades,
        montoAdicional: entrega.monto_adicional,
        anfitrionaId: entrega.anfitriona_id ?? null,
        habitacionId: entrega.habitacion_id ?? null
      }));
      const data = await entregarGrupoEntradas(
        {
          entradaIds: entregas.map(entrega => entrega.entradaId),
          unidades: [],
          montoAdicional: 0,
          usuarioId: user.id,
          entregas
        },
        registrarVenta
      );
      for (const entrega of body.entregas) {
        notificarEntradaActualizada({
          entradaId: entrega.entrada_id,
          accion: 'entregada',
          clienteNombre: null,
          tipo: entrega.monto_adicional > 0 ? 'upgrade' : 'cover',
          montoCobrarBarra: entrega.monto_adicional,
          entregadaPorNombre: `${user.name} ${user.lastName}`.trim()
        });
      }
      return NextResponse.json({ success: true, data });
    }

    const data = await entregarGrupoEntradas(
      {
        entradaIds: body.entrada_ids,
        unidades: body.unidades,
        montoAdicional: body.monto_adicional,
        usuarioId: user.id
      },
      registrarVenta
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
