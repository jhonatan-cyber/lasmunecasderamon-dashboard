import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

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
        message: "Falta el id" 
      });
    }
    
    // Solo permitir actualización de estado
    if (req.body.estado !== undefined) {

      
      // Validar que el estado sea válido (0, 1, o 2)
      if (![0, 1, 2].includes(req.body.estado)) {
        return res.status(400).json({ 
          success: false, 
          message: "Estado inválido. Solo se permiten valores 0, 1, o 2" 
        });
      }
      
      await query(
        "UPDATE pedidos SET estado = ? WHERE id_pedido = ?",
        [req.body.estado, id]
      );
      
   
      
      return res
        .status(200)
        .json({ success: true, message: "Estado del pedido actualizado correctamente" });
    }
    
    // Si no se está actualizando el estado, retornar error
    return res.status(400).json({ 
      success: false, 
      message: "Solo se permite actualizar el estado del pedido" 
    });
    
  } catch (error) {
   
    return res
      .status(500)
      .json({ success: false, message: "Error al actualizar el estado del pedido", error });
  }
}