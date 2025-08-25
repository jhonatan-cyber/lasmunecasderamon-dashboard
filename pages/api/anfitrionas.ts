import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

const mapUserFromDB = (row: any) => ({
  id: row.id_usuario,
  run: row.run,
  nick: row.nick,
  name: row.nombre,
  lastName: row.apellido,
  email: row.email,
  phone: row.telefono,
  address: row.direccion,
  maritalStatus: row.estado_civil,
  role: row.rol_nombre,
  roleId: row.id_rol,
  afp: row.afp,
  salary: row.sueldo,
  contributions: row.aporte,
  discount: row.descuento,
  status: row.estado,
  foto: row.foto,
  created_at: row.fecha_crea,
  updated_at: row.fecha_mod,
  deleted_at: row.fecha_baja
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ 
      success: false, 
      message: `Método ${req.method} no permitido` 
    });
  }

  try {
    // Obtener solo anfitrionas activas
    const anfitrionasData = (await query(
      `SELECT u.*, r.nombre as rol_nombre, r.id_rol 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.estado = 1 AND r.nombre = 'anfitriona'`
    )) as any[];

    return res.status(200).json({
      success: true,
      data: anfitrionasData.map(mapUserFromDB)
    });
  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Error al obtener anfitrionas',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
