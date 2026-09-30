import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { pollEquipo, pollTodos, estaCorriendo } from '@/lib/biometric/recordPoller';

/**
 * Recolección manual de registros (Configuraciones → Asistencia).
 *
 * GET  → estado del ciclo de fondo.
 * POST → recoger ahora: `{ equipoId }` para un equipo, sin cuerpo para todos.
 */
export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  return NextResponse.json({ success: true, data: { corriendo: estaCorriendo() } });
});

export const POST = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request) => {
    const body = await request.json().catch(() => ({}));
    const equipoId = body?.equipoId ? String(body.equipoId) : null;

    if (equipoId) {
      try {
        const resumen = await pollEquipo(equipoId);
        return NextResponse.json({ success: true, data: resumen });
      } catch (error) {
        return NextResponse.json(
          {
            success: false,
            message: error instanceof Error ? error.message : 'No se pudo recoger del equipo'
          },
          { status: 502 }
        );
      }
    }

    const resumenes = await pollTodos();
    return NextResponse.json({ success: true, data: resumenes });
  }
);
