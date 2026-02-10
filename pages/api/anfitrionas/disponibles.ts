import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

const mapUserFromDB = (row: any) => ({
  id_usuario: row.id_usuario,
  id: row.id_usuario,
  nombre: row.nombre,
  name: row.nombre,
  apellido: row.apellido,
  lastName: row.apellido,
  nick: row.nick,
  email: row.email,
  telefono: row.telefono,
  estado: row.estado,
  rol_id: row.rol_id,
  rol_nombre: row.rol_nombre,
  fecha_crea: row.fecha_crea,
  fecha_mod: row.fecha_mod,
  imagen: row.imagen
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  try {

    const anfitrionasDisponibles = (await query(
      `SELECT u.*, r.nombre as rol_nombre, r.id_rol 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.estado = 1 
       AND r.nombre = 'anfitriona'
       AND u.id_usuario NOT IN (
         -- Anfitrionas en servicios activos
         SELECT DISTINCT ds.usuario_id 
         FROM detalle_servicios ds
         INNER JOIN servicios s ON ds.servicio_id = s.id_servicio
         WHERE s.estado = 1
       )
       ORDER BY u.nick ASC`
    )) as any[];

    return res.status(200).json({
      success: true,
      data: anfitrionasDisponibles.map(mapUserFromDB)
    });
  } catch (error) {
    console.error('Error al obtener anfitrionas disponibles:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener anfitrionas disponibles'
    });
  }
}