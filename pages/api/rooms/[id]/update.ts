import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { z } from "zod";

const updateRoomSchema = z.object({
  price: z.preprocess((v) => Number(v), z.number().min(0, "El precio debe ser mayor o igual a 0")).optional(),
  time: z.preprocess((v) => Number(v), z.number().min(1, "El tiempo debe ser mayor a 0")).optional(),
}).refine((data) => data.price !== undefined || data.time !== undefined, {
  message: "Debe proporcionar al menos precio o tiempo para actualizar",
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "PUT") {
    return res.status(405).json({ 
      success: false, 
      message: `Método ${req.method} no permitido` 
    });
  }

  try {
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "ID de habitación requerido" 
      });
    }

    const parse = updateRoomSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: "Datos inválidos",
        errors: parse.error.issues,
      });
    }

    const { price, time } = parse.data;

    // Verificar que la habitación existe
    const existingRoom: any = await query(
      "SELECT id_habitacion, precio, tiempo FROM habitaciones WHERE id_habitacion = ?",
      [id]
    );

    if (!Array.isArray(existingRoom) || existingRoom.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    // Usar valores existentes si no se proporcionan nuevos
    const currentRoom = existingRoom[0];
    const newPrice = price !== undefined ? price : currentRoom.precio;
    const newTime = time !== undefined ? time : currentRoom.tiempo;

    // Actualizar solo los campos proporcionados
    await query(
      "UPDATE habitaciones SET precio = ?, tiempo = ?, fecha_mod = NOW() WHERE id_habitacion = ?",
      [newPrice, newTime, id]
    );

    return res.status(200).json({
      success: true,
      message: "Habitación actualizada correctamente",
      data: { id, price: newPrice, time: newTime }
    });

  } catch (error) {
   
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}
