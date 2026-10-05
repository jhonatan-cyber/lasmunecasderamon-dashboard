import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/modules/identidad';
import { estadoEnEquipos } from '@/modules/asistencia';
import { NotFoundError } from '@/lib/errors/errors';

/**
 * ¿Dónde está cargada AHORA la persona?
 *
 * Para cada lector no revocado devuelve si la persona existe en el equipo
 * (NetSDK `USER_SERVICE_GET`) o por qué no se pudo saber. El diálogo de
 * enrolamiento lo usa para mostrar el estado real por equipo y ofrecer
 * «Restaurar» cuando falta (p. ej. quedó fuera tras una desactivación).
 *
 * GET /api/users/[id]/biometric/devices → { data: PresenciaEnEquipo[] }
 */
export const GET = withRoute(
  { auth: true, module: 'users', action: 'read' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const usuarioId = id;
    const usuario = await UserService.getById(usuarioId);
    if (!usuario) throw new NotFoundError('Usuario', usuarioId);

    const codigo = String(usuario.biometrico_codigo || '').trim();
    if (!codigo) {
      // Sin código la persona no puede existir en ningún equipo: respuesta vacía
      // y el diálogo muestra su estado normal de «sin enrolar».
      return NextResponse.json({ success: true, data: [] });
    }

    const nombre = `${usuario.name || ''} ${usuario.lastName || ''}`.trim();
    const data = await estadoEnEquipos({ usuarioId, nombre, codigo });
    return NextResponse.json({ success: true, data });
  }
);
