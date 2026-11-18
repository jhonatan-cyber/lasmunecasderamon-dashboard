import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { ValidationError } from '@/lib/errors/errors';
import { obtenerSolicitudCover, rechazarSolicitudCover } from '@/modules/entradas';

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request, { params, user }) => {
    // El barman entrega covers solicitando autorización: no puede rechazar la
    // solicitud que él mismo envió.
    if (user.role?.toLowerCase() === 'barman')
      return ApiResponse.forbidden('La solicitud la responde la caja o la administración');
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const motivo = String(body.motivo || '').trim();
    if (!motivo) throw new ValidationError('Indica el motivo del rechazo');
    const solicitud = await obtenerSolicitudCover(id);
    if (!solicitud) throw new ValidationError('La solicitud ya no existe');
    if (solicitud.estado !== 'pendiente')
      throw new ValidationError('La solicitud ya fue respondida');
    await rechazarSolicitudCover(id, user.id, motivo);
    return NextResponse.json({ success: true });
  }
);
