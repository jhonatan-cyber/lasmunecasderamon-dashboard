import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';
import { verificarCoincidenciaFacial } from '@/modules/asistencia';
import { NotFoundError } from '@/lib/errors/errors';

/**
 * Verifica que la cara que el lector está viendo AHORA sea la misma de la foto
 * guardada de la persona (plantilla maestra en `biometric_plantillas`).
 *
 * El servidor captura la foto en vivo (`snapshot.cgi`), le pide al motor facial
 * del equipo el vector de ambas fotos (NetSDK `CLIENT_FaceInfoOpreate` →
 * GETFACEEIGEN) y compara con similitud coseno. Si no coincide, el diálogo de
 * enrolamiento avisa antes de guardar.
 */
export const POST = withRoute(
  { auth: true, module: 'users', action: 'write', audit: true },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const deviceId = String(body?.deviceId || '').trim();
    if (!deviceId) {
      return NextResponse.json(
        { success: false, message: 'deviceId es requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const usuario = await UserService.getById(id);
    if (!usuario) throw new NotFoundError('Usuario', id);

    const resultado = await verificarCoincidenciaFacial(deviceId, {
      usuarioId: id,
      nombre: usuario.name,
      codigo: String(usuario.biometrico_codigo || '')
    });

    if (!resultado.ok) {
      // SDK ausente es un problema del servidor (503); el resto son condiciones
      // que el operador puede resolver (sin foto de referencia, sin cara, etc.).
      const status = resultado.motivo === 'sdk_no_disponible' ? 503 : 400;
      return NextResponse.json(
        { success: false, message: resultado.mensaje, code: resultado.motivo ?? 'VERIFICACION' },
        { status }
      );
    }

    return NextResponse.json({
      success: true,
      message: resultado.mensaje,
      data: {
        coincide: resultado.coincide,
        similitud: resultado.similitud,
        umbral: resultado.umbral,
        captura: resultado.captura,
        plantilla: resultado.plantilla
      }
    });
  }
);
