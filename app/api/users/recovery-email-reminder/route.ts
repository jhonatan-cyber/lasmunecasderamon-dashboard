import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { notificarStaffSinCorreoRecuperacion } from '@/modules/identidad';

/**
 * POST /api/users/recovery-email-reminder
 *
 * Envía una notificación in-app y un push a todos los usuarios de staff
 * (barman, garzón, anfitriona, cajero) que no tienen correo de recuperación
 * configurado. Solo accesible por administradores.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async () => {
    try {
      const notificados = await notificarStaffSinCorreoRecuperacion();
      return NextResponse.json({
        success: true,
        message: `Se envió la notificación a ${notificados} usuario(s) de staff sin correo de recuperación.`,
        count: notificados
      });
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Error al enviar las notificaciones.' },
        { status: 500 }
      );
    }
  }
);
