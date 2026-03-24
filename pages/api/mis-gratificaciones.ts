/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  if (req.method === 'GET') {
    try {
      const tableCheckResult = (await query(`
        SHOW TABLES LIKE 'gratificaciones'
      `)) as any[];
      const tableExists = tableCheckResult.length > 0 && Object.keys(tableCheckResult[0]).length > 0;

      if (!tableExists) {
        return res.status(200).json([]);
      }

      const query_str = `
        SELECT 
          G.id as id,
          DATE_FORMAT(G.fecha_hora, "%Y-%m-%d %H:%i:%s") as fecha_hora,
          U.id_usuario, 
          CONCAT(U.nombre, ' ', U.apellido) AS usuario, 
          G.monto,
          G.descripcion,
          G.fecha_crea,
          G.fecha_mod,
          G.estado
        FROM gratificaciones G
        INNER JOIN usuarios U ON U.id_usuario = G.usuario_id
        WHERE G.usuario_id = ?
        ORDER BY G.fecha_hora DESC
      `;

      const rowsResult = (await query(query_str, [currentUser.id])) as any[];
      const rowsArray = Array.isArray(rowsResult) ? rowsResult : [rowsResult];

      const processedRows = rowsArray.map((row: any) => ({
        id: String(row.id),
        fecha_hora: String(row.fecha_hora),
        id_usuario: String(row.id_usuario),
        usuario: String(row.usuario),
        monto: Number(row.monto),
        descripcion: String(row.descripcion || ''),
        fecha_crea: String(row.fecha_crea),
        fecha_mod: String(row.fecha_mod || ''),
        estado: Number(row.estado)
      }));

      return res.status(200).json(processedRows);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener gratificaciones del usuario',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);
