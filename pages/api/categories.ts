import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { z } from "zod";


const categorySchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  description: z.string().optional().default("")
});

const mapCategoryFromDB = (row: any) => ({
  id: row.id_categoria,
  name: row.nombre,
  description: row.descripcion ?? "",
  status: row.estado,
  total_products: row.total_productos || 0,
  created_at: row.fecha_crea,
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log("Obteniendo categorías...");
    
    const results = await query(`
      SELECT 
        C.id_categoria,
        C.nombre,
        C.descripcion,
        C.estado,
        C.fecha_crea,
        COUNT(P.id_producto) AS total_productos
      FROM 
        categorias C
      LEFT JOIN 
        productos P ON P.categoria_id = C.id_categoria AND P.estado = 1
      GROUP BY C.id_categoria, C.nombre, C.descripcion, C.estado, C.fecha_crea
      ORDER BY C.nombre ASC
    `, []);
    
    console.log("Resultados de la consulta:", results);
    
    const categories = Array.isArray(results) ? results.map(mapCategoryFromDB) : [];
    console.log("Categorías mapeadas:", categories);
    
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error al obtener categorías", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, message: "Datos inválidos", errors: parse.error.errors });
    }
    // Validar duplicado por nombre
    const dup = await query("SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?)", [parse.data.name]);
    if (Array.isArray(dup) && dup.length) {
      return res.status(400).json({ success: false, message: "Ya existe una categoría con ese nombre" });
    }
    const result: any = await query(
      "INSERT INTO categorias (nombre, descripcion, estado) VALUES (?, ?, 1)",
      [parse.data.name, parse.data.description]
    );
    return res.status(201).json({ success: true, message: "Categoría creada correctamente", id: result.insertId });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al crear categoría", error });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: "Falta el id" });
    const parse = categorySchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ success: false, message: "Datos inválidos", errors: parse.error.errors });
    }
    // Validar duplicado por nombre (excluyendo el actual)
    const dup = await query("SELECT id_categoria FROM categorias WHERE LOWER(nombre) = LOWER(?) AND id_categoria != ?", [parse.data.name, id]);
    if (Array.isArray(dup) && dup.length) {
      return res.status(400).json({ success: false, message: "Ya existe una categoría con ese nombre" });
    }
    await query(
      "UPDATE categorias SET nombre = ?, descripcion = ? WHERE id_categoria = ?",
      [parse.data.name, parse.data.description, id]
    );
    return res.status(200).json({ success: true, message: "Categoría actualizada correctamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al actualizar categoría", error });
  }
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, action } = req.query;
  if (!id || !action) {
    return res.status(400).json({ success: false, message: "Faltan parámetros id o action" });
  }
  let newStatus;
  if (action === "activate") newStatus = 1;
  else if (action === "deactivate") newStatus = 0;
  else return res.status(400).json({ success: false, message: "Acción no válida" });
  try {
    await query("UPDATE categorias SET estado = ? WHERE id_categoria = ?", [newStatus, id]);
    return res.status(200).json({ success: true, message: `Categoría ${action === "activate" ? "activada" : "desactivada"} correctamente` });
  } catch (error) {
    return res.status(500).json({ success: false, message: `Error al ${action === "activate" ? "activar" : "desactivar"} categoría`, error });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ success: false, message: "Falta el id" });
  try {
    await query("DELETE FROM categorias WHERE id_categoria = ?", [id]);
    return res.status(200).json({ success: true, message: "Categoría eliminada correctamente" });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Error al eliminar categoría", error });
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
    case "PATCH":
      return await handlePatch(req, res);
    case "DELETE":
      return await handleDelete(req, res);
    default:
      res.setHeader("Allow", ["GET", "POST", "PUT", "PATCH", "DELETE"]);
      return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  }
} 