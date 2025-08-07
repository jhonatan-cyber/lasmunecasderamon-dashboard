import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { z } from "zod";


const roomSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  price: z.preprocess((v) => Number(v), z.number()),
  time: z.preprocess((v) => Number(v), z.number()),
});

const mapRoomFromDB = (row: any) => ({
  id: row.id_habitacion,
  name: row.nombre,
  price: row.precio,
  time: row.tiempo,
  status: row.estado,
  fecha_crea: row.fecha_crea,
  fecha_mod: row.fecha_mod,
  fecha_elim: row.fecha_elim,
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { status } = req.query;
    let results;
    if (status !== undefined) {
      results = await query("SELECT * FROM habitaciones WHERE estado = ?", [status]);
    } else {
      results = await query("SELECT * FROM habitaciones", []);
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
          errors: parse.error.errors,
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
    const result: any = await query(
      "INSERT INTO habitaciones (nombre, precio, tiempo) VALUES (?, ?, ?)",
      [parse.data.name, parse.data.price, parse.data.time]
    );
    return res
      .status(201)
      .json({
        success: true,
        message: "Habitación creada correctamente",
        id: result.insertId,
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
          errors: parse.error.errors,
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
      "UPDATE habitaciones SET nombre = ?, precio = ?, tiempo = ? WHERE id_habitacion = ?",
      [parse.data.name, parse.data.price, parse.data.time, id]
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
    await query("DELETE FROM habitaciones WHERE id_habitacion = ?", [id]);
    return res
      .status(200)
      .json({ success: true, message: "Habitación eliminada correctamente" });
  } catch (error) {
    return res
      .status(500)
      .json({ success: false, message: "Error al eliminar habitación", error });
  }
};

/**
 * @swagger
 * /api/rooms:
 *   get:
 *     summary: Obtener lista de habitaciones
 *     description: Obtiene la lista completa de habitaciones del sistema
 *     tags: [Habitaciones]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: ['disponible', 'ocupada', 'mantenimiento']
 *         description: Filtrar por estado de la habitación
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: ['individual', 'doble', 'suite']
 *         description: Filtrar por tipo de habitación
 *     responses:
 *       200:
 *         description: Lista de habitaciones obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Room'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 20
 *                     pages:
 *                       type: integer
 *                       example: 2
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crear nueva habitación
 *     description: Crea una nueva habitación en el sistema
 *     tags: [Habitaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - numero
 *               - tipo
 *               - precio
 *             properties:
 *               numero:
 *                 type: string
 *                 example: "101"
 *                 description: Número de la habitación
 *               tipo:
 *                 type: string
 *                 enum: ['individual', 'doble', 'suite']
 *                 example: "doble"
 *                 description: Tipo de habitación
 *               precio:
 *                 type: number
 *                 format: float
 *                 example: 150.00
 *                 description: Precio por noche
 *               descripcion:
 *                 type: string
 *                 example: "Habitación con vista al mar"
 *                 description: Descripción de la habitación
 *               capacidad:
 *                 type: integer
 *                 example: 2
 *                 description: Capacidad de personas
 *               estado:
 *                 type: string
 *                 default: "disponible"
 *                 enum: ['disponible', 'ocupada', 'mantenimiento']
 *                 example: "disponible"
 *                 description: Estado inicial de la habitación
 *     responses:
 *       201:
 *         description: Habitación creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Room'
 *                 message:
 *                   type: string
 *                   example: "Habitación creada exitosamente"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Habitación ya existe
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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
