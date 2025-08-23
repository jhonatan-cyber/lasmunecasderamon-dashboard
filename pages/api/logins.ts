import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withAuth } from "@/lib/middleware/auth";

// Mapeo de login desde la base de datos
const mapLoginFromDB = (row: any) => ({
  id_login: row.id_login,
  usuario_id: row.usuario_id,
  fecha_login: row.fecha_login,
  fecha_logout: row.fecha_logout,
  ip_address: row.ip_address,
  user_agent: row.user_agent,
  estado: row.estado,
  token_session: row.token_session,
  usuario_nombre: row.usuario_nombre,
  usuario_nick: row.usuario_nick,
  usuario_rol: row.usuario_rol,
});

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case "GET":
      return handleGet(req, res);
    default:
      return res.status(405).json({
        success: false,
        message: "Método no permitido",
      });
  }
}

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { estado, usuario_id, fecha_inicio, fecha_fin } = req.query;

    let sql = `
      SELECT 
        l.*,
        CONCAT(u.nombre, ' ', u.apellido) as usuario_nombre,
        u.nick as usuario_nick,
        r.nombre as usuario_rol
      FROM logins l
      INNER JOIN usuarios u ON l.usuario_id = u.id_usuario
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE 1=1
    `;

    const params = [];

    if (estado) {
      sql += " AND l.estado = ?";
      // Convertir 'activo' a 1 y 'cerrado' a 0 si es necesario
      const estadoValue = estado === 'activo' ? 1 : estado === 'cerrado' ? 0 : estado;
      params.push(estadoValue);
    }

    if (usuario_id) {
      sql += " AND l.usuario_id = ?";
      params.push(usuario_id);
    }

    if (fecha_inicio) {
      sql += " AND DATE(l.fecha_login) >= ?";
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      sql += " AND DATE(l.fecha_login) <= ?";
      params.push(fecha_fin);
    }

    sql += " ORDER BY l.fecha_login DESC";

    const results = await query(sql, params);
    const logins = Array.isArray(results) ? results.map(mapLoginFromDB) : [];

    return res.status(200).json({
      success: true,
      data: logins,
    });
  } catch (error) {
    console.error("Error en GET /api/logins:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export default withAuth(handler); 