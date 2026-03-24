import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

type AnfitrionaRow = {
  id_usuario?: number;
  nombre?: string;
  apellido?: string;
  nick?: string;
  email?: string;
  telefono?: string;
  estado?: number;
  estado_servicio?: number;
  rol_id?: number;
  rol_nombre?: string;
  fecha_crea?: string;
  fecha_mod?: string;
  imagen?: string;
};

const mapUserFromDB = (row: AnfitrionaRow) => ({
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
  estado_servicio: row.estado_servicio,
  rol_id: row.rol_id,
  rol_nombre: row.rol_nombre,
  fecha_crea: row.fecha_crea,
  fecha_mod: row.fecha_mod,
  imagen: row.imagen,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      message: 'Metodo no permitido',
    });
  }

  try {
    const anfitrionasDisponibles = (await query(
      `SELECT u.*, r.nombre as rol_nombre, r.id_rol 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE (u.estado = 1 OR u.estado = 2)
       AND r.nombre = 'anfitriona'
       AND u.id_usuario NOT IN (
         SELECT DISTINCT ds.usuario_id 
         FROM detalle_servicios ds
         INNER JOIN servicios s ON ds.servicio_id = s.id_servicio
         LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
         WHERE s.estado = 1 
           AND (h.id_habitacion IS NULL OR (h.precio = 0 AND h.comision_anfitriona = 0 AND h.tiempo = 0))
       )
       ORDER BY u.nick ASC`
    )) as AnfitrionaRow[];

    return res.status(200).json({
      success: true,
      data: anfitrionasDisponibles.map(mapUserFromDB),
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener anfitrionas disponibles',
    });
  }
}
