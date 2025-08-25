import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Obtener anfitrionas logueadas hoy usando la consulta específica
    const anfitrionas = await query(`
      SELECT U.id_usuario, U.nick, L.last_login, L.estado
      FROM logins L 
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id 
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE R.nombre = 'Anfitriona' AND L.estado = 1 
    `);

    // Obtener garzones logueados hoy
    const garzones = await query(`
      SELECT U.id_usuario, U.nick, L.last_login, L.estado
      FROM logins L 
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id 
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE R.nombre = 'Garzon' AND L.estado = 1 
    `);

    // Obtener cajeros logueados hoy
    const cajeros = await query(`
      SELECT U.id_usuario, U.nick, L.last_login, L.estado
      FROM logins L 
      INNER JOIN usuarios U ON U.id_usuario = L.usuario_id 
      INNER JOIN roles R ON R.id_rol = U.rol_id
      WHERE R.nombre = 'Cajero' AND L.estado = 1 
    `);

    // Obtener total de usuarios activos por rol
    const totalUsersStats = await query(`
      SELECT 
        r.nombre as rol,
        COUNT(u.id_usuario) as total_usuarios
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE u.estado = 1
        AND r.nombre IN ('Anfitriona', 'Garzon', 'Cajero')
      GROUP BY r.nombre
      ORDER BY r.nombre
    `);

    // Crear un objeto con las estadísticas
    const stats = {
      anfitrionas: {
        logueadas: Array.isArray(anfitrionas) ? anfitrionas.length : 0,
        usuarios: Array.isArray(anfitrionas) ? anfitrionas : [],
        total: 0,
        porcentaje: 0
      },
      garzones: {
        logueadas: Array.isArray(garzones) ? garzones.length : 0,
        usuarios: Array.isArray(garzones) ? garzones : [],
        total: 0,
        porcentaje: 0
      },
      cajeros: {
        logueadas: Array.isArray(cajeros) ? cajeros.length : 0,
        usuarios: Array.isArray(cajeros) ? cajeros : [],
        total: 0,
        porcentaje: 0
      }
    };

    // Procesar total de usuarios
    if (Array.isArray(totalUsersStats)) {
      totalUsersStats.forEach((item: any) => {
        const rol = item.rol.toLowerCase();
        if (rol === 'anfitriona') {
          stats.anfitrionas.total = item.total_usuarios;
          stats.anfitrionas.porcentaje =
            item.total_usuarios > 0
              ? Math.round((stats.anfitrionas.logueadas / item.total_usuarios) * 100)
              : 0;
        } else if (rol === 'garzon') {
          stats.garzones.total = item.total_usuarios;
          stats.garzones.porcentaje =
            item.total_usuarios > 0
              ? Math.round((stats.garzones.logueadas / item.total_usuarios) * 100)
              : 0;
        } else if (rol === 'cajero') {
          stats.cajeros.total = item.total_usuarios;
          stats.cajeros.porcentaje =
            item.total_usuarios > 0
              ? Math.round((stats.cajeros.logueadas / item.total_usuarios) * 100)
              : 0;
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}
