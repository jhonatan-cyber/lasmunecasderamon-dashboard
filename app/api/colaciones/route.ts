import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarColaciones, registrarColacion } from '@/modules/colaciones';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async request => {
  const fecha = new URL(request.url).searchParams.get('fecha') || undefined;
  const cajaId = new URL(request.url).searchParams.get('caja_id') || undefined;
  if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
    throw new ValidationError('La fecha debe tener formato AAAA-MM-DD');
  const data = await listarColaciones(fecha, cajaId);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request, { user }) => {
    const body = await request.json();
    const usuarioId = String(body.usuario_id || '');
    const presentacionId = String(body.presentacion_id || '');
    const nombreBebida = String(body.nombre_bebida || '');
    const acompanamiento = body.acompanamiento == null ? null : String(body.acompanamiento);
    if (acompanamiento !== null && !['gaseosa', 'soda'].includes(acompanamiento))
      throw new ValidationError('Selecciona un acompañamiento válido');
    const result = await registrarColacion({
      usuarioId,
      presentacionId,
      nombreBebida,
      acompanamiento: acompanamiento as 'gaseosa' | 'soda' | null,
      registradoPor: user.id
    });
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);
