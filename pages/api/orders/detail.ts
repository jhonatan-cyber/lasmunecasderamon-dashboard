import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  }
  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, message: "Falta el id del pedido" });
  }
  try {
    // Obtener detalles del pedido
    const results = await query("CALL get_order_detail_by_id(?)", [id]);
    const details = Array.isArray((results as any)[0]) ? (results as any)[0] : results;
    
    // Obtener las anfitrionas del pedido con sus IDs
    const anfitrionasQuery = `
      SELECT 
        pu.usuario_id,
        u.nick,
        CONCAT(u.nombre, ' ', u.apellido) as nombre_completo
      FROM pedidos_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id_usuario
      WHERE pu.pedido_id = ?
    `;
    const anfitrionas = await query(anfitrionasQuery, [id]);
    
    // Agregar las anfitrionas al primer elemento de details
    if (details.length > 0) {
      details[0].anfitrionas_con_ids = anfitrionas;
    }
    
    return res.status(200).json({ success: true, data: details });
  } catch (error) {
    console.error("Error al obtener el detalle del pedido:", error);
    return res.status(500).json({ success: false, message: "Error al obtener el detalle del pedido", error });
  }
} 