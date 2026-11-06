import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';
import { entregarEntrada } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (_request, { params, user }) => {
    const { id } = await params;
    const filas = await query<any[]>(
      `SELECT * FROM solicitudes_entrega_cortesias WHERE id = ? FOR UPDATE`,
      [id]
    );
    const solicitud = filas[0];
    if (!solicitud) throw new ValidationError('La solicitud ya no existe');
    if (solicitud.estado !== 'pendiente')
      throw new ValidationError('La solicitud ya fue respondida');

    const unidades = Array.isArray(solicitud.unidades)
      ? solicitud.unidades
      : JSON.parse(solicitud.unidades || '[]');

    for (const unidad of unidades) {
      const data = await entregarEntrada(
        {
          entradaId: unidad.entrada_id,
          presentacionId: unidad.presentacion_id,
          acompanamientos: unidad.acompanamientos || null,
          montoAdicional: unidad.monto_adicional == null ? null : Number(unidad.monto_adicional),
          tipoEntrega: unidad.tipo_entrega === 'corte' ? 'corte' : 'botella',
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
          return { ventaId: venta?.id ? String(venta.id) : null };
        }
      );
      notificarEntradaActualizada({
        entradaId: unidad.entrada_id,
        accion: 'entregada',
        clienteNombre: solicitud.cliente_nombre,
        tipo: data.tipo,
        montoCobrarBarra: data.montoCobrarBarra,
        entregadaPorNombre: `${user.name} ${user.lastName}`.trim()
      });
    }

    await query(
      `UPDATE solicitudes_entrega_cortesias
          SET estado = 'aprobada', autorizado_por = ?, fecha_respuesta = ?
        WHERE id = ?`,
      [user.id, getNowInBusinessTimezone(), id]
    );
    return NextResponse.json({ success: true, data: { entregadas: unidades.length } });
  }
);
