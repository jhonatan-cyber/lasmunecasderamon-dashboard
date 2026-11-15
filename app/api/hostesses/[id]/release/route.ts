import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { actualizarDisponibilidadAnfitrionas } from '@/modules/identidad/disponibilidad/repositorio';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { query } from '@/lib/database/db';
import { BusinessError } from '@/lib/errors/errors';

export const POST = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
  async (request, { params }) => {
    const { id } = await params;
    const userId = String(id);

    await enUnaUnidad(async (unidad) => {
      await unidad.ejecutar(async (contexto) => {
        // Verificar que el usuario es anfitriona y está ocupada
        const usuario = await query<any[]>(
          `SELECT u.id_usuario, u.estado_servicio, u.estado, r.nombre as rol_nombre
           FROM usuarios u
           LEFT JOIN roles r ON u.rol_id = r.id_rol
           WHERE u.id_usuario = ?`,
          [userId]
        );

        if (!usuario.length) {
          throw new BusinessError('No se encontró al usuario', 'USER_NOT_FOUND');
        }

        const row = usuario[0];
        const esAnfitriona = row.rol_nombre?.toLowerCase() === 'anfitriona';
        if (!esAnfitriona) {
          throw new BusinessError('El usuario no es una anfitriona', 'NOT_HOSTESS');
        }

        const estaOcupada =
          Number(row.estado_servicio) === 1 ||
          (await (async () => {
            const activos = await query<any[]>(
              `SELECT COUNT(*) as total FROM detalle_servicios ds
               JOIN servicios s ON s.id_servicio = ds.servicio_id
               WHERE ds.usuario_id = ? AND ds.liberado_en IS NULL AND s.estado IN (2, 3)`,
              [userId]
            );
            return Number(activos[0]?.total || 0) > 0;
          })());

        if (!estaOcupada) {
          throw new BusinessError('La anfitriona no está ocupada en ningún servicio', 'NOT_OCCUPIED');
        }

        // Liberar la anfitriona
        await actualizarDisponibilidadAnfitrionas(contexto, [userId]);
      });
    });

    sendNotificationToAll('resource_updated', { module: 'users' });

    return NextResponse.json({
      success: true,
      message: 'Anfitriona liberada correctamente'
    });
  }
);
