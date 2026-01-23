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
    const details = await query(`
      SELECT 
        P.id_pedido,
        
        -- Concatenar nombres de anfitrionas
        (
            SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ')
            FROM pedidos_usuarios PU
            INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id
            WHERE PU.pedido_id = P.id_pedido
        ) AS anfitriona,

        -- Concatenar IDs de anfitrionas
        (
            SELECT GROUP_CONCAT(U2.id_usuario SEPARATOR ', ')
            FROM pedidos_usuarios PU
            INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id
            WHERE PU.pedido_id = P.id_pedido
        ) AS anfitrionaIds,

        DP.cantidad,
        C.nombre AS categoria,
        COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Cliente no registrado') AS cliente,
        P.cliente_id,
        P.codigo,
        DP.comision,
        DP.genera_comision,
        DP.hostess_id,
        CONCAT(G.nombre, ' ', G.apellido) AS garzon,
        PR.nombre AS producto,
        PR.id_producto,
        DP.precio,
        DP.subtotal,
        P.total,
        P.total_comision,
        P.subtotal AS total_subtotal,
        P.fecha_crea

      FROM detalle_pedidos DP
      INNER JOIN pedidos P ON P.id_pedido = DP.pedido_id
      LEFT JOIN productos PR ON PR.id_producto = DP.producto_id
      LEFT JOIN categorias C ON C.id_categoria = PR.categoria_id
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios G ON G.id_usuario = P.mesero_id

      WHERE DP.pedido_id = ?
    `, [id]) as any[];
    
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

    return res.status(500).json({ success: false, message: "Error al obtener el detalle del pedido", error });
  }
} 