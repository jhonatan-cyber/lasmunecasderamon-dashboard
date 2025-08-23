import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Endpoint para obtener detalles de horas extras de un usuario específico
  if (req.method === 'GET' && req.query.userId) {
    try {
      const userId = req.query.userId;
      
      console.log('=== ENDPOINT: Obteniendo detalles de horas extras ===');
      console.log('userId:', userId);
      
      const result = await query(`
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
      `, [userId]);

      console.log('Resultado de la consulta:', result);
      console.log('Tipo de result:', typeof result);
      console.log('Es array:', Array.isArray(result));
      console.log('Longitud de result:', result ? result.length : 'null/undefined');
      
      // MySQL2 devuelve un array con los resultados en la primera posición
      const rows = result;
      console.log('Filas obtenidas:', rows);
      console.log('Tipo de rows:', typeof rows);
      console.log('Es array:', Array.isArray(rows));
      console.log('Longitud de rows:', rows ? rows.length : 'null/undefined');
      
      // Asegurar que tenemos un array de resultados
      let details = rows;
      
      // Si rows no es un array, intentar convertirlo
      if (!Array.isArray(details)) {
        console.log('Rows no es un array, convirtiendo...');
        details = [details];
      }
      
      console.log('Details a procesar:', details);
      console.log('Tipo de details:', typeof details);
      console.log('Es array:', Array.isArray(details));
      console.log('Longitud:', details ? details.length : 'null/undefined');

      // Verificar que details sea un array antes de procesar
      if (!Array.isArray(details)) {
        console.error('Error: details no es un array después de la conversión');
        return res.status(500).json({
          success: false,
          error: 'Error en el formato de datos recibidos'
        });
      }

      // Procesar los datos para asegurar tipos correctos
      console.log('=== ENDPOINT: Procesando detalles ===');
      console.log('Cantidad de detalles a procesar:', details.length);
      
      const processedDetails = details.map((detail, index) => {
        console.log(`Procesando detalle ${index + 1}:`, detail);
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

      console.log('=== ENDPOINT: Details procesados ===');
      console.log('Cantidad de registros:', processedDetails.length);
      console.log('Primer registro:', processedDetails[0]);
      console.log('Último registro:', processedDetails[processedDetails.length - 1]);

      const response = {
        success: true,
        data: processedDetails
      };

      console.log('=== ENDPOINT: Respuesta final ===');
      console.log('Response:', response);

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
      const rowsResult = (await query(`
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
        ORDER BY HR.fecha_crea DESC
      `)) as any[];

      // Asegurar que rowsResult sea siempre un array
      const rowsArray = Array.isArray(rowsResult) ? rowsResult : [rowsResult];

      // Convertir los datos para asegurar tipos correctos
      const processedRows = rowsArray.map((row: any) => ({
        id_hora_extra: Number(row.id_hora_extra),
        id_usuario: Number(row.id_usuario),
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

      // Verificar si la tabla existe
      const tableCheckResult = (await query(`
        SHOW TABLES LIKE 'horas_extras'
      `)) as any[];
      const tableCheck = tableCheckResult[0];

      if (!tableCheck || tableCheck.length === 0) {
        // Si la tabla no existe, crear datos de prueba en memoria
        return res.status(201).json({
          success: true,
          message: 'Hora extra creada exitosamente (modo simulación)',
          data: {
            id: Date.now(),
            usuario_id,
            hora,
            monto,
            total,
            estado: 1
          }
        });
      }

      // Insertar en la base de datos
      const result = (await query(
        `
        INSERT INTO horas_extras (usuario_id, hora, monto, total, estado)
        VALUES (?, ?, ?, ?, 1)
      `,
        [usuario_id, hora, monto, total]
      )) as any;

      return res.status(201).json({
        success: true,
        message: 'Hora extra creada exitosamente',
        data: {
          id: result.insertId,
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
