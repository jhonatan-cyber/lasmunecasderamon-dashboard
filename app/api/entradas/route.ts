import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarEntradas, registrarEntrada } from '@/modules/entradas';
import { SaleService } from '@/workflows/ventas';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async request => {
  const fecha = new URL(request.url).searchParams.get('fecha') || undefined;
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new ValidationError('La fecha debe tener formato AAAA-MM-DD');
  return NextResponse.json({ success: true, data: await listarEntradas(fecha) });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const partes = Array.isArray(body.partes) ? body.partes : [];
    const result = await registrarEntrada(
      {
        clienteNombre: String(body.cliente_nombre || ''),
        montoEntrada: Number(body.monto_entrada),
        metodoPago: String(body.metodo_pago || 'efectivo'),
        productosCortesia:
          Array.isArray(body.productos_cortesia) && body.productos_cortesia.length > 0
            ? body.productos_cortesia.map((item: Record<string, unknown>) => ({
                presentacionId: String(item.presentacionId || item.presentacion_id || ''),
                cantidad: Number(item.cantidad),
                acompanamientoPresentacionId:
                  item.acompanamientoId || item.acompanamiento_presentacion_id
                    ? String(item.acompanamientoId || item.acompanamiento_presentacion_id)
                    : null
              }))
            : !Number(body.monto_bebida_adicional || 0) && body.bebida_cortesia_presentacion_id
              ? [
                  {
                    presentacionId: String(body.bebida_cortesia_presentacion_id),
                    cantidad: Math.max(1, Number(body.cantidad_entradas) || partes.length || 1),
                    acompanamientoPresentacionId: body.bebida_acompanamiento_presentacion_id
                      ? String(body.bebida_acompanamiento_presentacion_id)
                      : null
                  }
                ]
              : [],
        fecha: String(body.fecha || ''),
        hora: String(body.hora || ''),
        registradoPor: user.id,
        partes: partes.length
          ? partes.map((parte: Record<string, unknown>) => ({
              montoBebidaAdicional: Number(parte.monto_bebida_adicional || 0),
              bebidaCortesiaPresentacionId: parte.bebida_cortesia_presentacion_id
                ? String(parte.bebida_cortesia_presentacion_id)
                : null,
              bebidaAcompanamientoPresentacionId: parte.bebida_acompanamiento_presentacion_id
                ? String(parte.bebida_acompanamiento_presentacion_id)
                : null
            }))
          : [
              {
                montoBebidaAdicional: Number(body.monto_bebida_adicional || 0),
                bebidaCortesiaPresentacionId: body.bebida_cortesia_presentacion_id
                  ? String(body.bebida_cortesia_presentacion_id)
                  : null,
                bebidaAcompanamientoPresentacionId: body.bebida_acompanamiento_presentacion_id
                  ? String(body.bebida_acompanamiento_presentacion_id)
                  : null
              }
            ]
      },
      // El módulo arma el plan de cortesía; la venta se registra aquí (§5: la
      // orquestación entre módulos vive en el adaptador HTTP) con el mismo contexto.
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
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);
