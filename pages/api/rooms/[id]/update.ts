import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { z } from "zod";

const updateRoomSchema = z.object({
  price: z.preprocess((v) => Number(v), z.number().min(0, "El precio debe ser mayor o igual a 0")).optional(),
  time: z.preprocess((v) => Number(v), z.number().min(1, "El tiempo debe ser mayor a 0")).optional(),
  comision_anfitriona: z.preprocess((v) => v === undefined || v === null || v === '' ? undefined : Number(v), z.number().min(0, "La comisión debe ser mayor o igual a 0").optional()).optional(),
}).refine((data) => data.price !== undefined || data.time !== undefined || data.comision_anfitriona !== undefined, {
  message: "Debe proporcionar al menos precio, tiempo o comisión para actualizar",
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


    const { price, time, comision_anfitriona } = parse.data;

    // Verificar que la habitación existe y obtener su nombre
    const existingRoom: any = await query(
      "SELECT id_habitacion, precio, tiempo, nombre, comision_anfitriona FROM habitaciones WHERE id_habitacion = ?",
      [id]
    );

    if (!Array.isArray(existingRoom) || existingRoom.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Habitación no encontrada",
      });
    }

    const currentRoom = existingRoom[0];
    const newPrice = price !== undefined ? price : currentRoom.precio;
    const newTime = time !== undefined ? time : currentRoom.tiempo;
    let newComision = currentRoom.comision_anfitriona;


    // Permitir actualizar comisión para cualquier habitación
    let updateFields = ["precio = ?", "tiempo = ?"];
    let updateValues = [newPrice, newTime];
    if (typeof comision_anfitriona !== "undefined") {
      updateFields.push("comision_anfitriona = ?");
      updateValues.push(comision_anfitriona);
      newComision = comision_anfitriona;
    }
    updateFields.push("fecha_mod = NOW()");
    updateValues.push(id);

    await query(
      `UPDATE habitaciones SET ${updateFields.join(", ")} WHERE id_habitacion = ?`,
      updateValues
    );

    return res.status(200).json({
      success: true,
      message: "Habitación actualizada correctamente",
      data: { id, price: newPrice, time: newTime, comision_anfitriona: newComision }
    });

  } catch (error) {
   
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}
