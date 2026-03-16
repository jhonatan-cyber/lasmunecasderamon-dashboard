import type { NextApiRequest, NextApiResponse } from "next";
import { query, generateUUID } from "@/lib/db";
import { z } from "zod";


const roomSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  price: z.preprocess((v) => Number(v), z.number()),
  time: z.preprocess((v) => Number(v), z.number()),
  comision_anfitriona: z.preprocess((v) => v === '' || v === null || v === undefined ? null : Number(v), z.number().nullable().optional()),
});

const mapRoomFromDB = (row: any) => ({
  id: row.id_habitacion,
  id_habitacion: row.id_habitacion, // Agregar también este campo
  name: row.nombre,
  nombre: row.nombre, // Agregar también este campo
  display_order: row.display_order,
  price: row.precio,
  precio: row.precio, // Agregar también este campo
  time: row.tiempo,
  tiempo: row.tiempo, // Agregar también este campo
  status: row.estado,
  estado: row.estado, // Agregar también este campo
  fecha_crea: row.fecha_crea,
  fecha_mod: row.fecha_mod,
  fecha_elim: row.fecha_elim,
  comision_anfitriona: row.comision_anfitriona ?? null,
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { status } = req.query;
    let results;
    if (status !== undefined) {
      // Si se solicita status=1 (habitaciones disponibles), excluir las que tienen servicios activos
      if (status === '1') {
        results = await query(
          `SELECT h.* FROM habitaciones h 
           WHERE h.estado = ? 
           AND NOT EXISTS (
             SELECT 1 FROM servicios s 
             WHERE s.habitacion_id = h.id_habitacion 
             AND s.estado = 1
           )
           ORDER BY h.display_order ASC, h.id_habitacion ASC`,
          [status]
        );
      } else {
        results = await query("SELECT * FROM habitaciones WHERE estado = ? ORDER BY display_order ASC, id_habitacion ASC", [status]);
      }
    } else {
      results = await query("SELECT * FROM habitaciones ORDER BY display_order ASC, id_habitacion ASC", []);
    }
    const rooms = Array.isArray(results) ? results.map(mapRoomFromDB) : [];
    return res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al obtener habitaciones",
        error,
      });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parse = roomSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Datos inválidos",
          errors: parse.error.issues,
        });
    }
    // Validar duplicado por nombre
    const dup = await query(
      "SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?)",
      [parse.data.name]
    );
    if (Array.isArray(dup) && dup.length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Ya existe una habitación con ese nombre",
        });
    }
    const id = generateUUID();
    await query(
      "INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona) VALUES (?, ?, ?, ?, ?)",
      [id, parse.data.name, parse.data.price, parse.data.time, parse.data.comision_anfitriona]
    );
    return res
      .status(201)
      .json({
        success: true,
        message: "Habitación creada correctamente",
        id: id,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error al crear habitación", error });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id)
      return res.status(400).json({ success: false, message: "Falta el id" });
    const parse = roomSchema.safeParse(req.body);
    if (!parse.success) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Datos inválidos",
          errors: parse.error.issues,
        });
    }
    // Validar duplicado por nombre (excluyendo el actual)
    const dup = await query(
      "SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?) AND id_habitacion != ?",
      [parse.data.name, id]
    );
    if (Array.isArray(dup) && dup.length) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Ya existe una habitación con ese nombre",
        });
    }
    await query(
      "UPDATE habitaciones SET nombre = ?, precio = ?, tiempo = ?, comision_anfitriona = ? WHERE id_habitacion = ?",
      [parse.data.name, parse.data.price, parse.data.time, parse.data.comision_anfitriona, id]
    );
    return res
      .status(200)
      .json({ success: true, message: "Habitación actualizada correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: "Error al actualizar habitación",
        error,
      });
  }
};

const handlePatch = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, action } = req.query;
  if (!id || !action) {
    return res
      .status(400)
      .json({ success: false, message: "Faltan parámetros id o action" });
  }
  let newStatus;
  if (action === "activate") newStatus = 1;
  else if (action === "deactivate") newStatus = 0;
  else if (action === "occupy") newStatus = 2;
  else
    return res
      .status(400)
      .json({ success: false, message: "Acción no válida" });
  try {
    await query("UPDATE habitaciones SET estado = ? WHERE id_habitacion = ?", [
      newStatus,
      id,
    ]);
    return res
      .status(200)
      .json({ success: true, message: `Habitación actualizada correctamente` });
  } catch (error) {
    return res
      .status(500)
      .json({
        success: false,
        message: `Error al actualizar habitación`,
        error,
      });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;
  if (!id)
    return res.status(400).json({ success: false, message: "Falta el id" });
  try {
    // Verificar referencias en servicios
    const refs: any = await query(
      'SELECT COUNT(*) AS cnt FROM servicios WHERE habitacion_id = ?',
      [id]
    );
    const count = Array.isArray(refs) ? (refs[0]?.cnt ?? 0) : 0;

    if (count > 0) {
      // Si hay referencias, no eliminar: desactivar por seguridad
      await query('UPDATE habitaciones SET estado = 0 WHERE id_habitacion = ?', [id]);
      return res.status(200).json({
        success: true,
        message:
          'La habitación está asociada a servicios y no puede eliminarse. Se desactivó en su lugar.'
      });
    }

    await query('DELETE FROM habitaciones WHERE id_habitacion = ?', [id]);
    return res.status(200).json({ success: true, message: 'Habitación eliminada correctamente' });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error al eliminar habitación", error });
  }
};


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
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
      return res
        .status(405)
        .json({ success: false, message: `Método ${req.method} no permitido` });
  }
}
