import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { sendNotificationToAll } from '../notifications/sse';
import { addServicioLog, initLogsTable } from '@/lib/logUtils';
import { getCurrentUser } from '@/lib/middleware/auth';

// Initialize logs table on module load
let tableInitialized = false;
const ensureTableExists = async () => {
  if (!tableInitialized) {
    await initLogsTable();
    tableInitialized = true;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await ensureTableExists();
  const { id } = req.query;
  const currentUser = getCurrentUser(req);

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de servicio es requerido'
    });
  }

  const servicioId = id;

  if (req.method === 'GET') {
    try {
      const servicios = (await query(
        `
        SELECT 
          s.id_servicio,
          s.codigo,
          s.cliente_id,
          s.habitacion_id,
          s.precio_habitacion,
          s.precio_servicio,
          s.iva,
          s.sub_total,
          s.total,
          s.tiempo,
          s.metodo_pago,
          s.fecha_crea,
          s.estado,
          s.created_by,
          COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre,
          h.nombre as habitacion_numero,
          h.comision_anfitriona as habitacion_comision,
          CONCAT(creator.nombre, ' ', creator.apellido) as creator_name,
          GROUP_CONCAT(DISTINCT 
            CASE 
              WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
              ELSE CONCAT(u.nombre, ' ', u.apellido)
            END 
            SEPARATOR ', '
          ) as anfitrionas_nombres
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id AND u.estado = 1
        WHERE s.id_servicio = ?
        GROUP BY s.id_servicio
      `,
        [servicioId]
      )) as any[];

      if (!servicios || servicios.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      const servicio = servicios[0] as any;
      const usuarios = await query(
        `
        SELECT 
          u.id_usuario,
          u.nombre,
          u.apellido,
          u.nick
        FROM detalle_servicios ds
        INNER JOIN usuarios u ON u.id_usuario = ds.usuario_id
        WHERE ds.servicio_id = ?
      `,
        [servicioId]
      );

      const detalles = await query(
        `
        SELECT 
          ds.id_detalle_servicio,
          ds.usuario_id,
          ds.servicio_id,
          u.nombre as usuario_nombre
        FROM detalle_servicios ds
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        WHERE ds.servicio_id = ?
      `,
        [servicioId]
      );

      const servicioCompleto = {
        ...servicio,
        usuarios: usuarios || [],
        detalles: detalles || []
      };

      return res.status(200).json({
        success: true,
        data: servicioCompleto
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener servicio'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        cliente_id,
        habitacion_id,
        precio_habitacion,
        precio_servicio,
        iva,
        sub_total,
        total,
        tiempo,
        usuarios
      } = req.body;

      if (!cliente_id || !precio_servicio || !tiempo) {
        return res.status(400).json({
          success: false,
          message: 'Cliente, precio de servicio y tiempo son requeridos'
        });
      }

      const [servicioPrevio] = (await query(`SELECT iva FROM servicios WHERE id_servicio = ?`, [
        servicioId
      ])) as any[];

      const ivaPrevio = Number(servicioPrevio?.iva || 0);
      const ivaNuevo = Number(iva || 0);
      const ivaDelta = ivaNuevo - ivaPrevio;

      await query(
        `
        UPDATE servicios SET
          cliente_id = ?,
          habitacion_id = ?,
          precio_habitacion = ?,
          precio_servicio = ?,
          iva = ?,
          sub_total = ?,
          total = ?,
          tiempo = ?
        WHERE id_servicio = ?
      `,
        [
          cliente_id,
          habitacion_id,
          precio_habitacion || 0,
          precio_servicio,
          ivaNuevo,
          sub_total,
          total,
          tiempo,
          servicioId
        ]
      );

      if (ivaDelta !== 0) {
        const cajaActiva = (await query(
          `SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`
        )) as any[];

        if (Array.isArray(cajaActiva) && cajaActiva.length > 0) {
          const cajaId = cajaActiva[0].id_caja;
          await query(`UPDATE cajas SET iva = GREATEST(0, iva + ?) WHERE id_caja = ?`, [
            ivaDelta,
            cajaId
          ]);
        }
      }

      await query('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);

      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        for (const usuarioId of usuarios) {
          await query('INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)', [
            usuarioId,
            servicioId
          ]);
        }
      }

      // -----------------------------------------------------------------
      // SSE: Broadcast update
      // -----------------------------------------------------------------
      try {
        const [updatedService] = (await query(`
          SELECT 
            s.id_servicio, s.codigo, s.habitacion_id as roomId, h.nombre as roomName,
            s.tiempo as duration, s.precio_servicio, s.precio_habitacion, s.iva, s.total,
            s.metodo_pago, s.fecha_crea as startTime, s.fecha_crea as created_at, s.estado,
            COALESCE(GROUP_CONCAT(DISTINCT 
              CASE 
                WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
                ELSE CONCAT(u.nombre, ' ', u.apellido)
              END 
              SEPARATOR ', '
            ), 'Sin asignar') as anfitrionas,
            COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente') as clienteNombre,
            h.comision_anfitriona as habitacion_comision
          FROM servicios s
          LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
          LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
          LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
          LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
          WHERE s.id_servicio = ?
          GROUP BY s.id_servicio
        `, [servicioId])) as any[];

        if (updatedService) {
          sendNotificationToAll('timer_updated', {
            ...updatedService,
            servicioId: updatedService.id_servicio,
            duration: Number(updatedService.duration),
            anfitrionas_ids: usuarios
          });
        }
      } catch (sseErr) {
        console.error('[SSE UPDATE] Error:', sseErr);
      }

      return res.status(200).json({
        success: true,
        message: 'Servicio actualizado exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar servicio'
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const {
        estado,
        precio_servicio,
        tiempo,
        precio_habitacion,
        metodo_pago,
        iva,
        sub_total,
        total
      } = req.body;

      if (estado !== undefined) {
        if (![0, 1, 2, 3, 4].includes(estado)) {
          return res.status(400).json({
            success: false,
            message: 'Estado inválido.'
          });
        }
        const [prevService] = await query('SELECT estado, habitacion_id FROM servicios WHERE id_servicio = ?', [servicioId]) as any[];
        const estadoAnterior = prevService?.estado;

        if (estado === 1 || estado === 0) {
          const [servicio] = await query('SELECT habitacion_id FROM servicios WHERE id_servicio = ?', [servicioId]) as any[];

          if (servicio && servicio.habitacion_id) {
            const habitacionId = servicio.habitacion_id;

            // Buscar timers pausados
            const [vPausada] = await query('SELECT id_venta, paused_at FROM ventas WHERE habitacion_id = ? AND estado = 3 ORDER BY paused_at DESC LIMIT 1', [habitacionId]) as any[];
            const [sPausado] = await query('SELECT id_servicio, paused_at FROM servicios WHERE habitacion_id = ? AND estado = 3 AND id_servicio != ? ORDER BY paused_at DESC LIMIT 1', [habitacionId, servicioId]) as any[];

            if (vPausada || sPausado) {
              const resumeVenta = vPausada && (!sPausado || new Date(vPausada.paused_at) >= new Date(sPausado.paused_at));

              if (resumeVenta) {
                await query('UPDATE ventas SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_venta = ?', [vPausada.id_venta]);
                const [sr] = await query('SELECT fecha_crea FROM ventas WHERE id_venta = ?', [vPausada.id_venta]) as any[];
                sendNotificationToAll('timer_resumed', { servicioId: vPausada.id_venta, tipoTransaccion: 'venta', newStartTime: sr.fecha_crea });
              } else {
                await query('UPDATE servicios SET estado = 2, fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [sPausado.id_servicio]);
                const [sr] = await query('SELECT fecha_crea FROM servicios WHERE id_servicio = ?', [sPausado.id_servicio]) as any[];
                sendNotificationToAll('timer_resumed', { servicioId: sPausado.id_servicio, tipoTransaccion: 'servicio', newStartTime: sr.fecha_crea });
              }
            } else {
              await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacionId]);
            }

            sendNotificationToAll('timer_stopped', { servicioId: servicioId, roomId: habitacionId });
          } else {
            await query('UPDATE habitaciones h INNER JOIN servicios s ON h.id_habitacion = s.habitacion_id SET h.estado = 1 WHERE s.id_servicio = ?', [servicioId]);
          }
        }

        if (estado === 1 && estadoAnterior !== 1) {
          await addServicioLog(servicioId, 'FINALIZADO', 'Servicio finalizado manualmente.', currentUser?.id);
        } else if (estado === 0 && estadoAnterior !== 0) {
          await addServicioLog(servicioId, 'ANULADO', 'Servicio anulado.', currentUser?.id);
        } else if (estado === 3 && estadoAnterior !== 3) {
          await addServicioLog(servicioId, 'PAUSA', 'Servicio pausado manualmente.', currentUser?.id);
          await query('UPDATE servicios SET paused_at = NOW() WHERE id_servicio = ?', [servicioId]);
        } else if (estado === 4 && estadoAnterior !== 4) {
          await addServicioLog(servicioId, 'SOLICITUD_ANULACION', 'Solicitud de anulación creada.', currentUser?.id);
        } else if (estadoAnterior === 3 && estado === 2) {
          const [pausedService] = await query('SELECT paused_at FROM servicios WHERE id_servicio = ?', [servicioId]) as any[];
          if (pausedService?.paused_at) {
            await query('UPDATE servicios SET fecha_crea = DATE_ADD(fecha_crea, INTERVAL TIMESTAMPDIFF(SECOND, paused_at, NOW()) SECOND), paused_at = NULL WHERE id_servicio = ?', [servicioId]);
            await addServicioLog(servicioId, 'REANUDACION', 'Servicio reanudado manualmente.', currentUser?.id);
          }
        }

        await query('UPDATE servicios SET estado = ? WHERE id_servicio = ?', [estado, servicioId]);

        if (estado === 1 || estado === 0) {
          const anfitrionas = await query('SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?', [servicioId]) as any[];
          for (const a of anfitrionas || []) {
            const [other] = await query('SELECT COUNT(*) as count FROM detalle_servicios ds JOIN servicios s ON ds.servicio_id = s.id_servicio WHERE s.estado IN (2, 4) AND s.id_servicio != ? AND ds.usuario_id = ?', [servicioId, a.usuario_id]) as any[];
            const [inV] = await query('SELECT COUNT(*) as count FROM ventas_usuarios vu JOIN ventas v ON vu.venta_id = v.id_venta WHERE v.estado = 2 AND vu.usuario_id = ?', [a.usuario_id]) as any[];
            if ((other?.count || 0) === 0 && (inV?.count || 0) === 0) {
              await query('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [a.usuario_id]);
              sendNotificationToAll('user_status_updated', { userId: a.usuario_id, status: 1 });
            }
          }
        }

        return res.status(200).json({ success: true, message: 'Estado actualizado' });
      }

      if (
        precio_servicio !== undefined &&
        precio_habitacion !== undefined &&
        metodo_pago !== undefined &&
        tiempo !== undefined
      ) {
        const [curr] = (await query(
          'SELECT precio_servicio, precio_habitacion, iva, total, habitacion_id, caja_id, metodo_pago FROM servicios WHERE id_servicio = ?',
          [servicioId]
        )) as any[];

        if (!curr) {
          return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        // REGLA: No se puede editar si el precio de servicio ya es mayor a 0
        if (Number(curr.precio_servicio) > 0) {
          return res.status(403).json({
            success: false,
            message: 'No se puede editar un servicio que ya tiene un precio asignado.'
          });
        }

        const newPrice = Number(precio_servicio);
        const newHabPrice = Number(precio_habitacion);

        // REGLA: Obtener reglas de comisión de la habitación
        const hInfo = (await query(
          'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
          [curr.habitacion_id]
        )) as any[];
        const comRoomBase = Number(hInfo[0]?.comision_anfitriona || 0);
        const tieneComRoom = comRoomBase > 0;

        let newIva = tieneComRoom ? 0 : Number(iva || 0);
        let newTotal = Number(total);

        // Redondeo si es tarjeta y NO tiene comisión
        if (metodo_pago === 'tarjeta' && !tieneComRoom) {
          const subTotalNum = Number(sub_total || 0);
          if (!newIva && subTotalNum) newIva = Math.floor(subTotalNum * 0.2);
          const currentT = subTotalNum + newHabPrice + newIva;
          const totalR = Math.ceil(currentT / 5000) * 5000;
          const exc = totalR - currentT;
          newTotal = totalR;
          newIva += exc;
        } else if (tieneComRoom) {
          newTotal = Number(sub_total || 0) + newHabPrice;
          newIva = 0;
        }

        const newTime = Number(tiempo);
        const totalDiff = newTotal - Number(curr.total);
        const ivaDiff = newIva - Number(curr.iva);

        await withTransaction(async connection => {
          await connection(
            'UPDATE servicios SET precio_servicio = ?, precio_habitacion = ?, iva = ?, sub_total = ?, total = ?, tiempo = ?, metodo_pago = ? WHERE id_servicio = ?',
            [newPrice, newHabPrice, newIva, sub_total, newTotal, newTime, metodo_pago, servicioId]
          );

          const priceDiff = newPrice - Number(curr.precio_servicio);
          if (priceDiff !== 0) {
            const anfitrionas = (await connection(
              'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
              [servicioId]
            )) as any[];

            if (anfitrionas.length > 0) {
              const [habitacion] = (await connection(
                'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
                [curr.habitacion_id]
              )) as any[];
              const comisionHab = Number(habitacion?.comision_anfitriona || 0);

              const comisionServicioBase = Math.floor(newPrice / anfitrionas.length);
              const comisionTotalIndiv =
                comisionServicioBase + Math.floor(comisionHab / anfitrionas.length);

              for (let i = 0; i < anfitrionas.length; i++) {
                const userId = anfitrionas[i].usuario_id;
                const [detalleExistente] = (await connection(
                  'SELECT comision_id FROM detalle_comisiones WHERE usuario_id = ? AND comision_id IN (SELECT id_comision FROM comisiones WHERE servicio_id = ?)',
                  [userId, servicioId]
                )) as any[];

                if (detalleExistente) {
                  const comId = detalleExistente.comision_id;
                  await connection('UPDATE comisiones SET monto = ? WHERE id_comision = ?', [
                    comisionTotalIndiv,
                    comId
                  ]);
                  await connection(
                    'UPDATE detalle_comisiones SET comision = ? WHERE comision_id = ? AND usuario_id = ?',
                    [comisionTotalIndiv, comId, userId]
                  );
                }
              }
            }
          }

          if (curr.caja_id && (totalDiff !== 0 || curr.metodo_pago !== metodo_pago)) {
            let oldPayCol = 'efectivo';
            if (curr.metodo_pago === 'tarjeta') oldPayCol = 'tarjeta';
            else if (curr.metodo_pago === 'transferencia') oldPayCol = 'transferencia';
            let newPayCol = 'efectivo';
            if (metodo_pago === 'tarjeta') newPayCol = 'tarjeta';
            else if (metodo_pago === 'transferencia') newPayCol = 'transferencia';

            if (curr.metodo_pago !== metodo_pago) {
              await connection(
                `UPDATE cajas SET 
                  servicio = servicio + ?, 
                  ${oldPayCol} = ${oldPayCol} - ?, 
                  ${newPayCol} = ${newPayCol} + ?,
                  iva = iva + ?,
                  comision = comision + ?
                WHERE id_caja = ?`,
                [totalDiff, Number(curr.total), newTotal, ivaDiff, priceDiff, curr.caja_id]
              );
            } else {
              await connection(
                `UPDATE cajas SET 
                  servicio = servicio + ?, 
                  ${newPayCol} = ${newPayCol} + ?,
                  iva = iva + ?,
                  comision = comision + ?
                WHERE id_caja = ?`,
                [totalDiff, totalDiff, ivaDiff, priceDiff, curr.caja_id]
              );
            }
          }

          return true;
        });

        return res.status(200).json({
          success: true,
          message: 'Servicio actualizado correctamente',
          data: {
            precio_servicio: newPrice,
            precio_habitacion: newHabPrice,
            tiempo: newTime,
            total: newTotal,
            metodo_pago: metodo_pago
          }
        });
      }

      if (precio_servicio !== undefined || tiempo !== undefined) {
        const [curr] = (await query(
          'SELECT precio_servicio, precio_habitacion, iva, total, habitacion_id, caja_id FROM servicios WHERE id_servicio = ?',
          [servicioId]
        )) as any[];

        if (!curr) {
          return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        // REGLA: No se puede editar si el precio de servicio ya es mayor a 0
        if (Number(curr.precio_servicio) > 0) {
          return res.status(403).json({
            success: false,
            message: 'No se puede editar un servicio que ya tiene un precio asignado.'
          });
        }

        const newPrice =
          precio_servicio !== undefined ? Number(precio_servicio) : Number(curr.precio_servicio);
        const newTime = tiempo !== undefined ? Number(tiempo) : Number(curr.tiempo);

        // Recalcular sub_total (es el precio de servicio) y total
        const sub_total = newPrice;
        // El total en el front se calcula como: nuevoSubTotal + precioHabitacionTotal + formData.iva
        // Recuperamos el precio_habitacion (que ya es el total por chicas en la tabla servicios)
        const total = sub_total + Number(curr.precio_habitacion) + Number(curr.iva);

        // Diferencias para actualizar caja
        const priceDiff = newPrice - Number(curr.precio_servicio);
        const totalDiff = total - Number(curr.total);

        await withTransaction(async connection => {
          // 1. Actualizar servicio
          await connection(
            'UPDATE servicios SET precio_servicio = ?, sub_total = ?, total = ?, tiempo = ? WHERE id_servicio = ?',
            [newPrice, sub_total, total, newTime, servicioId]
          );

          // 2. Si el precio cambió, actualizar comisiones
          if (priceDiff !== 0) {
            // Obtener anfitrionas del servicio
            const anfitrionas = (await connection(
              'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
              [servicioId]
            )) as any[];

            if (anfitrionas.length > 0) {
              // Obtener comision de habitacion
              const [habitacion] = (await connection(
                'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
                [curr.habitacion_id]
              )) as any[];
              const comisionHab = Number(habitacion?.comision_anfitriona || 0);

              const comisionServicioBase = Math.floor(newPrice / anfitrionas.length);
              const comisionTotalIndiv =
                comisionServicioBase + Math.floor(comisionHab / anfitrionas.length);

              // Actualizar tabla comisiones y detalle_comisiones
              for (let i = 0; i < anfitrionas.length; i++) {
                const userId = anfitrionas[i].usuario_id;
                const [detalleExistente] = (await connection(
                  'SELECT comision_id FROM detalle_comisiones WHERE usuario_id = ? AND comision_id IN (SELECT id_comision FROM comisiones WHERE servicio_id = ?)',
                  [userId, servicioId]
                )) as any[];

                if (detalleExistente) {
                  const comId = detalleExistente.comision_id;
                  await connection('UPDATE comisiones SET monto = ? WHERE id_comision = ?', [
                    comisionTotalIndiv,
                    comId
                  ]);
                  await connection(
                    'UPDATE detalle_comisiones SET comision = ? WHERE comision_id = ? AND usuario_id = ?',
                    [comisionTotalIndiv, comId, userId]
                  );
                }
              }

              // 3. Actualizar caja si hay diferencia
              if (curr.caja_id) {
                const comisionTotalDiff = priceDiff; // La parte de habitacion no cambia, solo la de servicio

                const [serv] = (await connection(
                  'SELECT metodo_pago FROM servicios WHERE id_servicio = ?',
                  [servicioId]
                )) as any[];
                const metodo = serv?.metodo_pago || 'efectivo';

                let payCol = 'efectivo';
                if (metodo === 'tarjeta') payCol = 'tarjeta';
                else if (metodo === 'transferencia') payCol = 'transferencia';

                await connection(
                  `UPDATE cajas SET 
                    servicio = servicio + ?, 
                    ${payCol} = ${payCol} + ?, 
                    comision = comision + ? 
                  WHERE id_caja = ?`,
                  [totalDiff, totalDiff, comisionTotalDiff, curr.caja_id]
                );
              }
            }
          }

          return true;
        });

        return res.status(200).json({
          success: true,
          message: 'Servicio actualizado correctamente',
          data: { precio_servicio: newPrice, tiempo: newTime, total }
        });
      }

      return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
    } catch (error) {
      console.error('Error in PATCH service:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar servicio'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Eliminar detalles primero
      await query('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);

      // Eliminar servicio
      await query('DELETE FROM servicios WHERE id_servicio = ?', [servicioId]);

      return res.status(200).json({
        success: true,
        message: 'Servicio eliminado exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar servicio'
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }
}
