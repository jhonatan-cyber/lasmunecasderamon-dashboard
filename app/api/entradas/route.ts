import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarEntradas, registrarEntrada } from '@/modules/entradas';
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
    const result = await registrarEntrada({
      clienteNombre: String(body.cliente_nombre || ''),
      montoEntrada: Number(body.monto_entrada),
      montoBebidaAdicional: Number(body.monto_bebida_adicional || 0),
      metodoPago: String(body.metodo_pago || 'efectivo'),
      bebidaCortesiaPresentacionId: body.bebida_cortesia_presentacion_id
        ? String(body.bebida_cortesia_presentacion_id)
        : null,
      bebidaAcompanamientoPresentacionId: body.bebida_acompanamiento_presentacion_id
        ? String(body.bebida_acompanamiento_presentacion_id)
        : null,
      fecha: String(body.fecha || ''),
      hora: String(body.hora || ''),
      registradoPor: user.id
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);
