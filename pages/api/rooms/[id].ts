import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: "Falta el id" 
    });
  }

  if (req.method === "GET") {
    try {
      const results = await query(
        "SELECT * FROM habitaciones WHERE id_habitacion = ?",
        [id]
      );
      
      if (Array.isArray(results) && results.length > 0) {
        const room = results[0] as any;
        return res.status(200).json({
          success: true,
          data: {
            id: room.id_habitacion,
            name: room.nombre,
            price: room.precio,
            time: room.tiempo,
            status: room.estado,
            fecha_crea: room.fecha_crea,
            fecha_mod: room.fecha_mod,
            fecha_elim: room.fecha_elim,
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: "Habitación no encontrada"
        });
      }
    } catch (error) {
     
      return res.status(500).json({
        success: false,
        message: "Error al obtener habitación",
        error,
      });
    }
  } else if (req.method === "PATCH") {
    try {
      const { action } = req.body;
      if (!action) {
        return res.status(400).json({ 
          success: false, 
          message: "Falta la acción" 
        });
      }

      let newStatus;
      if (action === "activate") newStatus = 1;
      else if (action === "deactivate") newStatus = 0;
      else if (action === "occupy") newStatus = 2;
      else {
        return res.status(400).json({ 
          success: false, 
          message: "Acción no válida" 
        });
      }



      await query(
        "UPDATE habitaciones SET estado = ? WHERE id_habitacion = ?",
        [newStatus, id]
      );

      

      return res.status(200).json({ 
        success: true, 
        message: "Habitación actualizada correctamente" 
      });

    } catch (error) {
      
      return res.status(500).json({
        success: false,
        message: "Error al actualizar habitación",
        error,
      });
    }
  } else {
    return res.status(405).json({ 
      success: false, 
      message: `Método ${req.method} no permitido` 
    });
  }
}