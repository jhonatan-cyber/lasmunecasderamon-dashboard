import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ValidationError } from '@/lib/errors/errors';
import { obtenerSolicitudCortesia, rechazarSolicitudCortesia } from '@/modules/entradas';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { params, user }) => {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, any>;
    const motivo = String(body.motivo || '').trim();
    if (!motivo) throw new ValidationError('Indica el motivo del rechazo');
    const solicitud = await obtenerSolicitudCortesia(id);
    if (!solicitud) throw new ValidationError('La solicitud ya no existe');
    if (solicitud.estado !== 'pendiente')
      throw new ValidationError('La solicitud ya fue respondida');
    await rechazarSolicitudCortesia(id, user.id, motivo);
    return NextResponse.json({ success: true });
  }
);
