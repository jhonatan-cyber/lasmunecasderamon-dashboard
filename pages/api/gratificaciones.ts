/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  const userInfo = await query(
    `SELECT u.*, r.nombre as rol_nombre 
     FROM usuarios u 
     LEFT JOIN roles r ON u.rol_id = r.id_rol 
     WHERE u.id_usuario = ?`,
    [currentUser.id]
  ) as any[];

  const user = userInfo[0];
  const isAdmin = user?.rol_nombre?.toLowerCase() === 'administrador';

  if (req.method === 'GET' && req.query.userId) {
    try {
      const tableCheckResult = (await query(`
        SHOW TABLES LIKE 'gratificaciones'
      `)) as any[];
      const tableExists = tableCheckResult.length > 0 && Object.keys(tableCheckResult[0]).length > 0;

      if (!tableExists) {
        return res.status(200).json({ success: true, data: [] });
      }

      const requestedUserId = req.query.userId as string;
      const targetUserId = isAdmin ? requestedUserId : currentUser.id;

      const result = (await query(
        `
        SELECT
          G.fecha_crea,
          G.fecha_mod,
          CONCAT(U.nombre, ' ', U.apellido) AS usuario,
          G.monto,
          G.descripcion,
          G.estado
        FROM gratificaciones G
        INNER JOIN usuarios U ON U.id_usuario = G.usuario_id
        WHERE G.usuario_id = ?
        ORDER BY G.fecha_crea DESC
      `,
        [targetUserId]
      )) as any[];

      const rows = result;
      let details = rows;

      if (!Array.isArray(details)) {
        details = [details];
      }

      if (!Array.isArray(details)) {
        return res.status(500).json({
          success: false,
          error: 'Error en el formato de datos recibidos'
        });
      }

      const processedDetails = details.map((detail: any) => ({
        fecha_crea: detail.fecha_crea,
        fecha_mod: detail.fecha_mod,
        usuario: String(detail.usuario),
        monto: Number(detail.monto),
        descripcion: String(detail.descripcion || ''),
        estado: Number(detail.estado)
      }));

      return res.status(200).json({
        success: true,
        data: processedDetails
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener detalles de gratificaciones'
      });
    }
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

      let query_str = `
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
      `;

      const params: any[] = [];

      if (!isAdmin) {
        query_str += ' WHERE G.usuario_id = ?';
        params.push(currentUser.id);
      }

      query_str += ' ORDER BY G.fecha_hora DESC';

      const rowsResult = (await query(query_str, params)) as any[];

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

      res.status(200).json(processedRows);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener gratificaciones',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { usuario_id, monto, descripcion } = req.body;

      if (!usuario_id || !monto) {
        return res.status(400).json({
          success: false,
          message: `El usuario y el monto son requeridos. Recibido: usuario_id=${usuario_id}, monto=${monto}, body=${JSON.stringify(req.body)}`
        });
      }

      if (monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      const tableCheckResult = (await query(`
        SHOW TABLES LIKE 'gratificaciones'
      `)) as any[];
      const tableCheck = tableCheckResult[0];

      if (!tableCheck || tableCheck.length === 0) {
        return res.status(201).json({
          success: true,
          message: 'Gratificación creada exitosamente (modo simulación)',
          data: {
            id: generateUUID(),
            usuario_id,
            monto,
            descripcion: descripcion || '',
            estado: 1
          }
        });
      }

      const id = generateUUID();
      const now = getNowInBusinessTimezone();
      const fecha_hora = now;

      const result = (await query(
        `
        INSERT INTO gratificaciones (id, fecha_hora, usuario_id, monto, descripcion, estado, fecha_crea)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `,
        [id, fecha_hora, usuario_id, monto, descripcion || '', now]
      )) as any;

      return res.status(201).json({
        success: true,
        message: 'Gratificación creada exitosamente',
        data: {
          id,
          fecha_hora,
          usuario_id,
          monto,
          descripcion: descripcion || '',
          estado: 1
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear la gratificación',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { id, monto, descripcion } = req.body;

      if (!id || !monto) {
        return res.status(400).json({
          success: false,
          message: 'El ID y el monto son requeridos'
        });
      }

      if (monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'El monto debe ser mayor a 0'
        });
      }

      const tableCheckResult = (await query(`
        SHOW TABLES LIKE 'gratificaciones'
      `)) as any[];
      const tableCheck = tableCheckResult[0];

      if (!tableCheck || tableCheck.length === 0) {
        return res.status(201).json({
          success: true,
          message: 'Gratificación actualizada exitosamente (modo simulación)',
          data: { id, monto, descripcion: descripcion || '' }
        });
      }

      const now = getNowInBusinessTimezone();
      const result = (await query(
        `
        UPDATE gratificaciones 
        SET monto = ?, descripcion = ?, fecha_mod = ? 
        WHERE id = ?
      `,
        [monto, descripcion || '', now, id]
      )) as any;

      return res.status(200).json({
        success: true,
        message: 'Gratificación actualizada exitosamente',
        data: { id, monto, descripcion: descripcion || '' }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar la gratificación',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.body;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'El ID es requerido'
        });
      }

      const tableCheckResult = (await query(`
        SHOW TABLES LIKE 'gratificaciones'
      `)) as any[];
      const tableCheck = tableCheckResult[0];

      if (!tableCheck || tableCheck.length === 0) {
        return res.status(201).json({
          success: true,
          message: 'Gratificación eliminada exitosamente (modo simulación)'
        });
      }

      const result = (await query(
        `DELETE FROM gratificaciones WHERE id = ?`,
        [id]
      )) as any;

      return res.status(200).json({
        success: true,
        message: 'Gratificación eliminada exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar la gratificación',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);

