import type { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Método no permitido" });
  }

  const { name = "" } = req.query;
  const search = String(name).trim().toLowerCase();

  // Si el parámetro está vacío, retorna vacío
  if (!search) {
    return res.status(200).json({ success: true, data: [] });
  }

  try {
    // Buscar también por precio si el usuario ingresa un número
    const isNumber = !isNaN(Number(search));
    const sql = `
      SELECT 
        P.id_producto, 
        P.nombre, 
        P.precio, 
        P.comision, 
        C.nombre AS categoria
      FROM productos P
      INNER JOIN categorias C ON C.id_categoria = P.categoria_id
      WHERE 
        LOWER(P.nombre) LIKE CONCAT('%', ?, '%')
        OR LOWER(C.nombre) LIKE CONCAT('%', ?, '%')
        ${isNumber ? 'OR P.precio = ?' : ''}
      LIMIT 20
    `;
    const params = isNumber ? [search, search, Number(search)] : [search, search];
    const productos = await query(sql, params);
    res.status(200).json({ success: true, data: productos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error al buscar productos", error });
  }
} 