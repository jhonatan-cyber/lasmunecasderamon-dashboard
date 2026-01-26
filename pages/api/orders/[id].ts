import type { NextApiRequest, NextApiResponse } from "next";
import { query, rawQuery } from "@/lib/db";

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
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
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ 
        success: false, 
        message: "Falta el id del pedido" 
      });
    }

    // Iniciar transacción para eliminar en orden correcto
    await rawQuery('START TRANSACTION');

    try {
      // Eliminar registros de anfitrionas específicas de productos (si existen)
      await query(`
        DELETE dpa FROM detalle_pedidos_anfitrionas dpa
        INNER JOIN detalle_pedidos dp ON dp.id_detalle_pedido = dpa.detalle_pedido_id
        WHERE dp.pedido_id = ?
      `, [id]);

      // Eliminar detalles del pedido
      await query('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
      
      // Eliminar usuarios asociados al pedido
      await query('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
      
      // Eliminar el pedido principal
      const result = await query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
      
      // Verificar si se eliminó algún registro
      if ((result as any).affectedRows === 0) {
        await rawQuery('ROLLBACK');
        return res.status(404).json({ 
          success: false, 
          message: "Pedido no encontrado" 
        });
      }

      await rawQuery('COMMIT');
      
      return res.status(200).json({ 
        success: true, 
        message: "Pedido eliminado correctamente" 
      });
      
    } catch (deleteError) {
      await rawQuery('ROLLBACK');
      throw deleteError;
    }
    
  } catch (error) {
    console.error('❌ Error al eliminar pedido:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Error al eliminar el pedido", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'PUT':
      return await handlePut(req, res);
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      return res.status(405).json({ 
        success: false, 
        message: `Método ${req.method} no permitido` 
      });
  }
}