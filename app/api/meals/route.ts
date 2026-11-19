import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarColaciones, registrarColacion } from '@/modules/colaciones';
import { rolSoloRecibeColacion } from '@/lib/business/colacionRoles';
import { ColacionCreateSchema } from '@/lib/business/schemas';
import { validateOrResponse } from '@/lib/api/validate';
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
  { auth: true, audit: true, module: 'products', action: 'register_colacion' },
  async (request, { user }) => {
    // La colación la entrega el barman: anfitriona, garzón y cajero solo la
    // reciben. El permiso ya lo niega, y esta validación cubre el caso aunque
    // el rol llegue a tener el permiso por catálogo.
    if (rolSoloRecibeColacion(user.role)) {
      return NextResponse.json(
        { success: false, message: 'Este rol solo recibe colación: no puede registrarla' },
        { status: 403 }
      );
    }
    const body = await request.json();
    const validated = validateOrResponse(ColacionCreateSchema, body);
    if (validated instanceof NextResponse) return validated;

    const usuarioId = String(validated.usuario_id);
    const presentacionId = String(validated.presentacion_id);
    const acompanamiento = validated.acompanamiento ?? null;
    const acompanamientoPresentacionId = validated.acompanamiento_presentacion_id ?? null;
    // `ml_bebida` y `nombre_bebida` los calcula el servidor desde la
    // configuración de la bebida: el stock que sale del bar no puede depender
    // de lo que declare el cliente. El `ml_bebida` que llega es informativo; no
    // se le pasa al módulo, y si no coincide con el calculado se avisa y la
    // respuesta devuelve el valor que quedó registrado, para que el cliente
    // se corrija.
    const mlBebida = validated.ml_bebida ?? null;
    const result = await registrarColacion({
      usuarioId,
      presentacionId,
      acompanamiento: acompanamiento as 'gaseosa' | 'soda' | null,
      acompanamientoPresentacionId,
      registradoPor: user.id
    });
    if (mlBebida !== null && Number.isFinite(mlBebida) && mlBebida !== result.ml_bebida) {
      logger.warn('La colación se registró con ml distintos a los que declaró el cliente', {
        context: 'POST /api/meals',
        presentacion_id: presentacionId,
        ml_declarado: mlBebida,
        ml_registrado: result.ml_bebida
      });
    }
    return NextResponse.json({ success: true, data: result }, { status: 201 });
  }
);
