/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";
import { query, generateUUID } from "@/lib/db";
import { getNowInBusinessTimezone } from "@/lib/timezoneService";

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
          fecha_baja
        FROM roles 
        ORDER BY nombre`
      ) as any[];

   

      return res.status(200).json({ 
        success: true, 
        data: roles 
      });
    } catch (error) {
    
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

      const id = generateUUID();
      const now = getNowInBusinessTimezone();
      await query(
        "INSERT INTO roles (id_rol, nombre, descripcion, estado, fecha_crea) VALUES (?, ?, ?, 1, ?)",
        [id, name, description, now]
      );

      return res.status(201).json({
        success: true,
        message: "Rol creado correctamente",
        data: { id: id }
      });
    } catch (error) {
      
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

      const now = getNowInBusinessTimezone();
      await query(
        "UPDATE roles SET nombre = ?, descripcion = ?, fecha_mod = ? WHERE id_rol = ?",
        [name, description, now, id]
      );

      return res.status(200).json({
        success: true,
        message: "Rol actualizado correctamente"
      });
    } catch (error) {
      
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

