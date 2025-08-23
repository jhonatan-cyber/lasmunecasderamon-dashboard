import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";
import { query } from "@/lib/db";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      // Obtener todos los roles con todos los campos necesarios
      const roles = await query(
        `SELECT 
          id_rol,
          nombre,
          descripcion,
          estado,
          fecha_crea,
          fecha_mod,
          fecha_baja,
          (SELECT COUNT(*) FROM usuarios WHERE rol_id = roles.id_rol) as userCount
        FROM roles 
        ORDER BY nombre`
      ) as any[];

      console.log('🔵 Roles obtenidos de la base de datos:', roles);

      return res.status(200).json({ 
        success: true, 
        data: roles 
      });
    } catch (error) {
      console.error('Error al obtener roles:', error);
      return res.status(500).json({ 
        success: false, 
        message: "Error interno del servidor" 
      });
    }
  }

  if (req.method === "POST") {
    try {
      const { name, description } = req.body;
      
      if (!name || !description) {
        return res.status(400).json({
          success: false,
          message: "Nombre y descripción son requeridos"
        });
      }

      const result = await query(
        "INSERT INTO roles (nombre, descripcion, estado) VALUES (?, ?, 1)",
        [name, description]
      ) as any;

      return res.status(201).json({
        success: true,
        message: "Rol creado correctamente",
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error al crear rol:', error);
      return res.status(500).json({
        success: false,
        message: "Error al crear el rol"
      });
    }
  }

  if (req.method === "PUT") {
    try {
      const { id, name, description } = req.body;
      
      if (!id || !name || !description) {
        return res.status(400).json({
          success: false,
          message: "ID, nombre y descripción son requeridos"
        });
      }

      await query(
        "UPDATE roles SET nombre = ?, descripcion = ?, fecha_mod = NOW() WHERE id_rol = ?",
        [name, description, id]
      );

      return res.status(200).json({
        success: true,
        message: "Rol actualizado correctamente"
      });
    } catch (error) {
      console.error('Error al actualizar rol:', error);
      return res.status(500).json({
        success: false,
        message: "Error al actualizar el rol"
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: `Método ${req.method} no permitido` 
  });
}

export default withAuth(handler);
