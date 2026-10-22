import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarPendientes } from '@/modules/entradas';
import { ValidationError } from '@/lib/errors/errors';

/** Cola de la barra: entradas cobradas en la puerta que aún no se sirvieron. */
export const GET = withRoute(
  { auth: true, module: 'entradas', action: 'deliver' },
  async request => {
    const fecha = new URL(request.url).searchParams.get('fecha') || undefined;
    if (fecha && !/^\d{4}-\d{2}-\d{2}$/.test(fecha))
      throw new ValidationError('La fecha debe tener formato AAAA-MM-DD');
    return NextResponse.json({ success: true, data: await listarPendientes(fecha) });
  }
);
