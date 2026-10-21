import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarColaciones, registrarColacion } from '@/modules/colaciones';
import { ValidationError } from '@/lib/errors/errors';
import logger from '@/lib/utils/logger';

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
    const acompanamiento = body.acompanamiento == null ? null : String(body.acompanamiento);
    if (acompanamiento !== null && !['gaseosa', 'soda'].includes(acompanamiento))
      throw new ValidationError('Selecciona un acompañamiento válido');
    const acompanamientoPresentacionId = body.acompanamiento_presentacion_id
      ? String(body.acompanamiento_presentacion_id)
      : null;
    // `ml_bebida` y `nombre_bebida` los calcula el servidor desde la
    // configuración de la bebida: el stock que sale del bar no puede depender
    // de lo que declare el cliente. El `ml_bebida` que llega es informativo; no
    // se le pasa al módulo, y si no coincide con el calculado se avisa y la
    // respuesta devuelve el valor que quedó registrado, para que el cliente
    // se corrija.
    const mlBebida =
      body.ml_bebida === undefined || body.ml_bebida === null ? null : Number(body.ml_bebida);
    const result = await registrarColacion({
      usuarioId,
      presentacionId,
      acompanamiento: acompanamiento as 'gaseosa' | 'soda' | null,
      acompanamientoPresentacionId,
      registradoPor: user.id
    });
    if (mlBebida !== null && Number.isFinite(mlBebida) && mlBebida !== result.ml_bebida) {
      logger.warn('La colación se registró con ml distintos a los que declaró el cliente', {
        context: 'POST /api/colaciones',
        presentacion_id: presentacionId,
        ml_declarado: mlBebida,
        ml_registrado: result.ml_bebida
      });
    }
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);
