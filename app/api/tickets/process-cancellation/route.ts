import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { ApiResponse } from '@/lib/api/api-response';
import { obtenerSolicitudAnulacionEntradaPorToken } from '@/modules/entradas';
import { procesarAnulacionEntrada } from '@/workflows/anulaciones-entrada';
import { AppError, ValidationError } from '@/lib/errors/errors';
import { notificarEntradaActualizada } from '@/lib/notifications/entradaNotificationUtils';
import type { MetodoDevolucion } from '@/modules/entradas';

/**
 * Procesa una solicitud de anulación de entrada: aprueba o rechaza.
 *
 * El administrador llega desde el link de WhatsApp con el token.
 * Al aprobar se debe indicar el método de devolución.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'entradas', action: 'deliver' },
  async (request: Request, { user }) => {
    const body = await request.json();
    const { token, action, metodoDevolucion } = body;

    if (!token) throw new ValidationError('Token de solicitud no válido');
    if (!action || !['confirmar', 'rechazar'].includes(action))
      throw new ValidationError('Acción no válida: usar "confirmar" o "rechazar"');

    const solicitud = await obtenerSolicitudAnulacionEntradaPorToken(token);
    if (!solicitud) throw new ValidationError('Solicitud no encontrada o ya procesada');

    const metodo = action === 'confirmar' ? (metodoDevolucion as MetodoDevolucion | null) : null;
    if (action === 'confirmar' && !metodoDevolucion)
      throw new ValidationError('Debes seleccionar el método de devolución');

    try {
      const resultado = await procesarAnulacionEntrada(
        solicitud.id,
        action === 'confirmar',
        metodo,
        user.id.toString()
      );

      if (action === 'confirmar') {
        notificarEntradaActualizada({
          entradaId: resultado.entradaId,
          accion: 'anulada',
          clienteNombre: solicitud.cliente_nombre,
          entregadaPorNombre: `${user.name} ${user.lastName}`.trim()
        });
      }

      return NextResponse.json({
        success: true,
        message:
          action === 'confirmar'
            ? 'Anulación confirmada, entrada devuelta'
            : 'Anulación rechazada, entrada permanece pendiente',
        data: resultado
      });
    } catch (error) {
      if (error instanceof AppError) return ApiResponse.error(error);
      throw error;
    }
  }
);
