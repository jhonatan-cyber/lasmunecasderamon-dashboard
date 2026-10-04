import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';
import { credencialesDeFila, verificarConexion } from '@/modules/asistencia';
import { apagarListener, encenderListener } from '@/modules/asistencia';

/**
 * Interruptor del recolector de registros de un equipo.
 *
 * Encenderlo exige credenciales completas y una conexión exitosa: no tiene
 * sentido dejar "encendido" un equipo al que el servidor no puede llegar.
 * Al encender también abre el LISTENER EN VIVO (tiempo real); el poller de 1
 * minuto queda como red de seguridad.
 */
export const PUT = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json();
    const encender = Boolean(body?.encender);

    if (!encender) {
      await query('UPDATE biometric_devices SET recoger_registros = 0 WHERE id = ?', [id]);
      apagarListener(id);
      return NextResponse.json({ success: true, message: 'Recolector apagado.' });
    }

    const filas = await query<
      {
        id: string;
        serial: string;
        ip: string | null;
        usuario_equipo: string | null;
        clave_cifrada: string | null;
      }[]
    >(
      'SELECT id, serial, ip, usuario_equipo, clave_cifrada FROM biometric_devices WHERE id = ? AND revocado_en IS NULL',
      [id]
    );
    const fila = filas[0];
    if (!fila) {
      return NextResponse.json(
        { success: false, message: 'Equipo no encontrado o revocado' },
        { status: 404 }
      );
    }

    const credenciales = credencialesDeFila(fila);
    if (!credenciales) {
      return NextResponse.json(
        {
          success: false,
          message: 'Cargá IP y credenciales del equipo antes de encender el recolector.'
        },
        { status: 400 }
      );
    }

    try {
      await verificarConexion(credenciales);
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          message: `No se pudo conectar al equipo: ${
            error instanceof Error ? error.message : 'error de conexión'
          }`
        },
        { status: 502 }
      );
    }

    await query('UPDATE biometric_devices SET recoger_registros = 1 WHERE id = ?', [id]);
    const vivo = await encenderListener(id);
    return NextResponse.json({
      success: true,
      message: vivo
        ? 'Recolector encendido: tiempo real activo + red de seguridad cada minuto.'
        : 'Recolector encendido (sin listener en vivo en este proceso; queda el ciclo de 1 minuto).'
    });
  }
);
