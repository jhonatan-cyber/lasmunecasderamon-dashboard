import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { guardarEnrolamientoDesdeTelefono } from '@/modules/asistencia';

/**
 * Enrolamiento facial desde el teléfono del trabajador: persiste el set de
 * capturas (frente / izquierda / derecha) como plantilla maestra de la persona.
 * El flag `biometrico_facial` y el codigo biometrico se gestionan en el resto
 * de los endpoints del recurso; aca se guarda la foto/plantilla.
 */
export const POST = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const fotos = Array.isArray(body?.fotos) ? body.fotos : [];
    const dispositivoId = String(body?.dispositivoId || '').trim() || 'movil';

    const resultado = await guardarEnrolamientoDesdeTelefono(id, fotos, dispositivoId);
    return NextResponse.json({
      success: resultado.ok,
      message: resultado.mensaje,
      data: resultado
    });
  }
);
