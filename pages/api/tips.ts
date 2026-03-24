/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery, generateUUID } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method, query: queryParams } = req;

  if (method === 'POST') {
    // REGISTRAR PROPINA
    try {
      const { venta_id, monto } = req.body;

      if (!venta_id || !monto || monto <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Venta ID y monto de propina son requeridos'
        });
      }

      // Solo cajeros y garzones con en_local = 1
      // (leyó QR/código antes 23:00, o inició sesión después de las 23:00)
      const usuariosLogueados = (await query(`
        SELECT DISTINCT u.id_usuario, u.nombre, u.apellido
        FROM logins l
        INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
        INNER JOIN roles r ON r.id_rol = u.rol_id
        WHERE l.estado = 1 AND l.en_local = 1 AND u.estado = 1
          AND r.nombre IN ('cajero', 'garzon')
      `)) as any[];

      if (!usuariosLogueados || usuariosLogueados.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No hay usuarios logueados disponibles para distribuir la propina'
        });
      }

      // Calcular el monto por usuario
      const montoPorUsuario = monto / usuariosLogueados.length;

      // Iniciar transacción
      await rawQuery('START TRANSACTION');

      try {
        // Insertar la propina principal
 
        const now = getNowInBusinessTimezone();
        const propinaId = generateUUID();
        await query(
          'INSERT INTO propinas (id_propina, venta_id, propina, fecha_crea) VALUES (?, ?, ?, ?)',
          [propinaId, venta_id, monto, now]
        );

        for (const usuario of usuariosLogueados) {
          await query(
            'INSERT INTO detalle_propinas (propina_id, usuario_id, monto, fecha_crea) VALUES (?, ?, ?, ?)',
            [propinaId, usuario.id_usuario, montoPorUsuario, now]
          );
        }

        await rawQuery('COMMIT');

        return res.status(201).json({
          success: true,
          message: 'Propina registrada y distribuida correctamente',
          data: {
            propina_id: propinaId,
            venta_id,
            monto_total: monto,
            usuarios_distribucion: usuariosLogueados.length,
            monto_por_usuario: montoPorUsuario,
            usuarios: usuariosLogueados
          }
        });
      } catch (error) {
        await rawQuery('ROLLBACK');

        throw error;
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al registrar la propina',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (method === 'GET') {
    // OBTENER PROPINAS
    try {
      const { tipo, usuario_id } = queryParams;

      // Obtener datos del usuario actual
      const currentUser = getCurrentUser(req);
      if (!currentUser) {
        return res.status(401).json({
          success: false,
          message: 'No autorizado'
        });
      }

      // Obtener información del rol del usuario
      const userInfo = (await query(
        `SELECT u.*, r.nombre as rol_nombre 
         FROM usuarios u 
         LEFT JOIN roles r ON u.rol_id = r.id_rol 
         WHERE u.id_usuario = ?`,
        [currentUser.id]
      )) as any[];

      const user = userInfo[0];
      const isAdmin = user?.rol_nombre?.toLowerCase() === 'administrador';

      if (!tipo) {
        return res.status(400).json({
          success: false,
          message: "El parámetro 'tipo' es requerido (resumen o detalle)"
        });
      }

      if (tipo === 'resumen') {
        // OBTENER RESUMEN DE PROPINAS
        const { caja_activa } = queryParams;
        let whereClause = '';
        const params: any[] = [];

        // Si no es administrador, mostrar solo sus propias propinas
        if (!isAdmin) {
          whereClause = 'WHERE DP.usuario_id = ?';
          params.push(currentUser.id);
        }

        if (caja_activa === '1') {
          const cajaAbiertaResult = await query(
            `SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`
          );
          const cajaAbierta = Array.isArray(cajaAbiertaResult)
            ? cajaAbiertaResult[0]
            : (cajaAbiertaResult as any);

          if (cajaAbierta?.id_caja) {
            // Unir con ventas para filtrar por la caja_id de la venta
            if (whereClause) {
              whereClause += ' AND V.caja_id = ?';
            } else {
              whereClause = 'WHERE V.caja_id = ?';
            }
            params.push(cajaAbierta.id_caja);
          } else {
            return res.status(200).json({
              success: true,
              data: []
            });
          }
        }

        const propinasResumen = (await query(
          `
          SELECT 
            U.id_usuario, 
            U.nick,
            CONCAT(U.nombre, ' ', U.apellido) AS nombre_completo,
            MAX(DP.fecha_crea) AS fecha_crea,
            SUM(CASE 
                WHEN P.estado = 1 THEN DP.monto 
                ELSE 0 
            END) AS total_propinas
          FROM propinas P 
          INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
          INNER JOIN usuarios U ON U.id_usuario = DP.usuario_id
          INNER JOIN ventas V ON V.id_venta = P.venta_id
          ${whereClause}
          GROUP BY 
            U.id_usuario, 
            U.nick,
            U.nombre, 
            U.apellido
          ORDER BY total_propinas DESC
        `,
          params
        )) as any[];

        return res.status(200).json({
          success: true,
          data: propinasResumen
        });
      } else if (tipo === 'detalle') {
        // OBTENER DETALLE DE PROPINAS
        // Si no es admin, mostrar solo sus detalles
        const finalUsuarioId = isAdmin && usuario_id ? usuario_id : currentUser.id;

        if (!finalUsuarioId) {
          return res.status(400).json({
            success: false,
            message: 'usuario_id es requerido para obtener detalle'
          });
        }

        const propinasDetalle = (await query(
          `
          SELECT 
            P.fecha_crea AS fecha_hora,
            V.codigo AS codigo_venta,
            DP.monto,
            CASE 
              WHEN P.estado = 1 THEN NULL
              ELSE P.fecha_crea
            END AS fecha_pago,
            CASE 
              WHEN P.estado = 1 THEN 'Por pagar'
              ELSE 'Pagado'
            END AS estado
          FROM propinas P 
          INNER JOIN detalle_propinas DP ON DP.propina_id = P.id_propina
          INNER JOIN ventas V ON V.id_venta = P.venta_id
          WHERE DP.usuario_id = ?
          ORDER BY P.fecha_crea DESC
        `,
          [finalUsuarioId]
        )) as any[];

        return res.status(200).json({
          success: true,
          data: propinasDetalle
        });
      } else {
        return res.status(400).json({
          success: false,
          message: "Tipo inválido. Use 'resumen' o 'detalle'"
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener propinas',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${method} no permitido`
    });
  }
}

export default withAuth(handler);

