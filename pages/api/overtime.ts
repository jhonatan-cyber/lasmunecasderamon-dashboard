/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Obtener usuario autenticado
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  // Obtener información del rol del usuario
  const userInfo = await query(
    `SELECT u.*, r.nombre as rol_nombre 
     FROM usuarios u 
     LEFT JOIN roles r ON u.rol_id = r.id_rol 
     WHERE u.id_usuario = ?`,
    [currentUser.id]
  ) as any[];

  const user = userInfo[0];
  const isAdmin = user?.rol_nombre?.toLowerCase() === 'administrador';

  // Endpoint para obtener detalles de horas extras de un usuario específico
  if (req.method === 'GET' && req.query.userId) {
    try {
      // Si no es admin, solo puede ver sus propias horas extras
      const userId = isAdmin ? req.query.userId : currentUser.id;

      const result = (await query(
        `
        SELECT
          HX.fecha_crea,
          HX.fecha_mod,
          CONCAT(U.nombre, ' ', U.apellido) AS usuario,
          HX.hora,
          HX.monto,
          HX.total,
          HX.estado
        FROM horas_extras HX
        INNER JOIN usuarios U ON U.id_usuario = HX.usuario_id
        WHERE HX.usuario_id = ?
        ORDER BY HX.fecha_crea DESC
      `,
        [userId]
      )) as any[];

      // MySQL2 devuelve un array con los resultados en la primera posición
      const rows = result;

      // Asegurar que tenemos un array de resultados
      let details = rows;

      // Si rows no es un array, intentar convertirlo
      if (!Array.isArray(details)) {
        details = [details];
      }

      // Verificar que details sea un array antes de procesar
      if (!Array.isArray(details)) {
        return res.status(500).json({
          success: false,
          error: 'Error en el formato de datos recibidos'
        });
      }

      const processedDetails = details.map((detail: any, index) => {
        return {
          fecha_crea: detail.fecha_crea,
          fecha_mod: detail.fecha_mod,
          usuario: String(detail.usuario),
          hora: Number(detail.hora),
          monto: Number(detail.monto),
          total: Number(detail.total),
          estado: Number(detail.estado)
        };
      });

      const response = {
        success: true,
        data: processedDetails
      };

      return res.status(200).json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Error al obtener detalles de horas extras'
      });
    }
  }

  // Endpoint para obtener el resumen de horas extras
  if (req.method === 'GET') {
    try {
      let query_str = `
        SELECT 
          HR.id_hora_extra,
          U.id_usuario, 
          CONCAT(U.nombre, ' ', U.apellido) AS usuario, 
          HR.hora,
          HR.monto,
          HR.total,
          HR.fecha_crea,
          HR.fecha_mod,
          HR.estado
        FROM horas_extras HR
        INNER JOIN usuarios U ON U.id_usuario = HR.usuario_id
      `;

      const params: any[] = [];

      // Si no es administrador, filtrar solo sus horas extras
      if (!isAdmin) {
        query_str += ' WHERE HR.usuario_id = ?';
        params.push(currentUser.id);
      }

      query_str += ' ORDER BY HR.fecha_crea DESC';

      const rowsResult = (await query(query_str, params)) as any[];

      // Asegurar que rowsResult sea siempre un array
      const rowsArray = Array.isArray(rowsResult) ? rowsResult : [rowsResult];

      // Convertir los datos para asegurar tipos correctos
      const processedRows = rowsArray.map((row: any) => ({
        id_hora_extra: row.id_hora_extra,
        id_usuario: row.id_usuario,
        usuario: String(row.usuario),
        hora: Number(row.hora),
        monto: Number(row.monto),
        total: Number(row.total),
        fecha_crea: String(row.fecha_crea),
        fecha_mod: String(row.fecha_mod || ''),
        estado: String(row.estado)
      }));

      res.status(200).json(processedRows);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener horas extras',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'POST') {
    try {
      const { usuario_id, hora, monto } = req.body;

      // Validaciones
      if (!usuario_id || !hora || !monto) {
        return res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
      }

      if (hora <= 0 || monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Las horas y el monto deben ser mayores a 0'
        });
      }

      // Calcular el total
      const total = hora * monto;

      const id = generateUUID();
      // Insertar en la base de datos
      await query(
        `
        INSERT INTO horas_extras (id_hora_extra, usuario_id, hora, monto, total, estado)
        VALUES (?, ?, ?, ?, ?, 1)
      `,
        [id, usuario_id, hora, monto, total]
      );

      return res.status(201).json({
        success: true,
        message: 'Hora extra creada exitosamente',
        data: {
          id: id,
          usuario_id,
          hora,
          monto,
          total,
          estado: 1
        }
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al crear la hora extra',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);

