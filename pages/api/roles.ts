import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { z } from "zod";

const roleSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional().default("")
});

const mapRoleFromDB = (row: any) => ({
  id: row.id_rol,
  name: row.nombre,
  description: row.descripcion ?? "",
  status: row.estado,
  created_at: row.fecha_crea,
  updated_at: row.fecha_mod,
  deleted_at: row.fecha_baja,
  userCount: row.user_count || 0
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log("Obteniendo roles...");
    
    const { id } = req.query;
    
    if (id) {
      const roleId = parseInt(id as string);
      const results = await query(`
        SELECT 
          r.id_rol,
          r.nombre,
          r.descripcion,
          r.estado,
          r.fecha_crea,
          r.fecha_mod,
          r.fecha_baja,
          COUNT(u.id_usuario) as user_count
        FROM roles r
        LEFT JOIN usuarios u ON u.rol_id = r.id_rol AND u.estado = 1
        WHERE r.id_rol = ?
        GROUP BY r.id_rol, r.nombre, r.descripcion, r.estado, r.fecha_crea, r.fecha_mod, r.fecha_baja
      `, [roleId]) as any[];
      
      if (results.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: "Rol no encontrado" 
        });
      }

      const role = mapRoleFromDB(results[0]);
      return res.status(200).json({ success: true, data: role });
    } else {
      const results = await query(`
        SELECT 
          r.id_rol,
          r.nombre,
          r.descripcion,
          r.estado,
          r.fecha_crea,
          r.fecha_mod,
          r.fecha_baja,
          COUNT(u.id_usuario) as user_count
        FROM roles r
        LEFT JOIN usuarios u ON u.rol_id = r.id_rol AND u.estado = 1
        GROUP BY r.id_rol, r.nombre, r.descripcion, r.estado, r.fecha_crea, r.fecha_mod, r.fecha_baja
        ORDER BY r.nombre ASC
      `) as any[];

      const formattedRoles = results.map(mapRoleFromDB);
      return res.status(200).json({ success: true, data: formattedRoles });
    }
  } catch (error) {
    console.error("Error al obtener roles:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error al obtener roles", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parse = roleSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ 
        success: false, 
        message: "Datos inválidos", 
        errors: parse.error.errors 
      });
    }

    // Validar duplicado por nombre
    const dup = await query("SELECT id_rol FROM roles WHERE LOWER(nombre) = LOWER(?)", [parse.data.name]) as any[];
    if (dup.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Ya existe un rol con ese nombre" 
      });
    }

    const result: any = await query(
      "CALL add_role(?, ?)",
      [parse.data.name, parse.data.description]
    );
    
    return res.status(201).json({ 
      success: true, 
      message: "Rol creado correctamente", 
      id: result.insertId 
    });
  } catch (error) {
    console.error("Error al crear rol:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error al crear rol", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id, name, description, action } = req.body;
    
    // Actualizar datos del rol
    if (id && name && description) {
      await query("CALL update_role(?, ?, ?)", [name, description, id]);
      return res.status(200).json({ 
        success: true, 
        message: "Rol actualizado correctamente" 
      });
    }
    
    // Activar rol
    if (req.query.id && req.query.action === "activate") {
      const roleId = parseInt(req.query.id as string);
      if (!roleId) {
        return res.status(400).json({ 
          success: false, 
          message: "ID requerido para activar" 
        });
      }
      await query("CALL high_role(?)", [roleId]);
      return res.status(200).json({ 
        success: true, 
        message: "Rol activado correctamente" 
      });
    }
    
    // Desactivar (baja lógica)
    if (req.query.id) {
      const roleId = req.query.id;
      if (!roleId || Array.isArray(roleId)) {
        return res.status(400).json({ 
          success: false, 
          message: "ID de rol no válido" 
        });
      }
      await query("CALL delete_role(?)", [roleId]);
      return res.status(200).json({ 
        success: true, 
        message: "Rol desactivado correctamente" 
      });
    }
    
    return res.status(400).json({ 
      success: false, 
      message: "Parámetros insuficientes" 
    });
  } catch (error) {
    console.error("Error al actualizar rol:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error al actualizar rol", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ 
        success: false, 
        message: "ID de rol no válido" 
      });
    }

    await query("CALL delete_role(?)", [id]);
    return res.status(200).json({ 
      success: true, 
      message: "Rol eliminado correctamente" 
    });
  } catch (error) {
    console.error("Error al eliminar el rol:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error al eliminar el rol", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case "GET":
      return await handleGet(req, res);
    case "POST":
      return await handlePost(req, res);
    case "PUT":
      return await handlePut(req, res);
    case "DELETE":
      return await handleDelete(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
      return res.status(405).json({ 
        success: false, 
        message: `Método ${req.method} no permitido` 
      });
  }
}
