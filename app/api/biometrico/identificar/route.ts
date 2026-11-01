import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { identificarPersonaEnPlantillas } from '@/modules/asistencia';

/**
 * Prueba física del enrolamiento: recibe una foto (webcam o teléfono) y
 * responde a quién se parece entre las personas enroladas, sin escribir
 * asistencias ni tocar el lector.
 */
export const POST = withRoute(
  { auth: true, module: 'users', action: 'read' },
  async (request: Request) => {
    const body = await request.json().catch(() => ({}));
    const foto = typeof body?.foto === 'string' ? body.foto.trim() : '';

    if (!foto) {
      return NextResponse.json(
        { success: false, message: 'Falta la foto a analizar.', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const limpio = foto.includes(',') ? foto.slice(foto.indexOf(',') + 1) : foto;
    const buffer = Buffer.from(limpio.replace(/\s+/g, ''), 'base64');

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, message: 'La foto llegó vacía.', code: 'VALIDATION' },
        { status: 400 }
      );
    }

    const resultado = await identificarPersonaEnPlantillas(buffer);

    if (!resultado.ok) {
      return NextResponse.json(
        { success: false, message: resultado.mensaje, code: resultado.motivo ?? 'ERROR' },
        { status: resultado.motivo === 'sin_cara' ? 422 : 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: resultado.mensaje,
      data: {
        umbral: resultado.umbral,
        evaluados: resultado.evaluados,
        mejor: resultado.mejor,
        candidatos: resultado.candidatos
      }
    });
  }
);
