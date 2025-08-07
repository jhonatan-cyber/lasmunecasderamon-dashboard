import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";
import { query } from "@/lib/db";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // @ts-ignore
  const authUser = req.user;
  
  if (!authUser) {
    console.log("No hay usuario autenticado");
    return res.status(401).json({ success: false, message: "No autenticado" });
  }

  try {
    // Obtener datos completos del usuario desde la base de datos
    const users = await query(
      `SELECT u.*, r.nombre as role_name 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.id_usuario = ? AND u.estado = 1`,
      [authUser.id]
    ) as any[];

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }

    const user = users[0];
    
    // Formatear los datos del usuario para el frontend
    const userData = {
      id: user.id_usuario,
      name: user.nombre || user.username || "Usuario",
      lastName: user.apellido || "",
      email: user.email,
      role: user.role_name || authUser.role,
      status: user.estado,
      foto: user.foto,
      username: user.username,
      permissions: authUser.permissions
    };


    return res.status(200).json({ success: true, user: userData });
  } catch (error) {
    console.error('Error al obtener datos del usuario:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor" 
    });
  }
}

export default withAuth(handler); 