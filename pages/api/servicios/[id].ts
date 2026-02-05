import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { sendNotificationToAll } from '../notifications/sse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de servicio es requerido'
    });
  }

  const servicioId = parseInt(id);

  if (req.method === 'GET') {
    try {
      // Obtener servicio con detalles
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

      // Obtener usuarios asociados
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

      // Obtener detalles
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

      // Validaciones
      if (!cliente_id || !precio_servicio || !tiempo) {
        return res.status(400).json({
          success: false,
          message: 'Cliente, precio de servicio y tiempo son requeridos'
        });
      }

      // Obtener IVA previo para calcular delta y ajustar caja
      const [servicioPrevio] = (await query(`SELECT iva FROM servicios WHERE id_servicio = ?`, [
        servicioId
      ])) as any[];

      const ivaPrevio = Number(servicioPrevio?.iva || 0);
      const ivaNuevo = Number(iva || 0);
      const ivaDelta = ivaNuevo - ivaPrevio;

      // Actualizar servicio
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

      // Ajustar IVA en caja abierta con el delta
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

      // Eliminar detalles existentes
      await query('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);

      // Insertar nuevos detalles
      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        for (const usuarioId of usuarios) {
          await query('INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)', [
            usuarioId,
            servicioId
          ]);
        }
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
      const { estado, precio_servicio, tiempo, precio_habitacion, metodo_pago, iva, sub_total, total } = req.body;

      if (estado !== undefined) {
        // Validar estado
        if (![0, 1, 2, 3].includes(estado)) {
          return res.status(400).json({
            success: false,
            message: 'Estado debe ser 0 (finalizado), 1 (activo), 2 (pendiente) o 3 (devuelto)'
          });
        }

        // Actualizar estado del servicio
        await query('UPDATE servicios SET estado = ? WHERE id_servicio = ?', [estado, servicioId]);

        // Si se está finalizando el servicio (estado = 0), liberar la habitación
        if (estado === 0) {
          // Obtener el habitacion_id primero para asegurar que tenemos el ID correcto
          const [servicio] = await query('SELECT habitacion_id FROM servicios WHERE id_servicio = ?', [servicioId]) as any[];
          if (servicio && servicio.habitacion_id) {
            await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [servicio.habitacion_id]);
            console.log(`✅ Habitación ${servicio.habitacion_id} liberada por finalización de servicio ${servicioId}`);
            
            // Enviar notificación SSE para sincronizar detención de timer
            sendNotificationToAll('timer_stopped', {
              servicioId: servicioId,
              roomId: servicio.habitacion_id
            });
            console.log(`📢 Notificación timer_stopped enviada para servicio ${servicioId}`);
          } else {
            // Intento alternativo por si el join directo fallaba antes
            await query(
              'UPDATE habitaciones h INNER JOIN servicios s ON h.id_habitacion = s.habitacion_id SET h.estado = 1 WHERE s.id_servicio = ?',
              [servicioId]
            );
          }
        }

        return res.status(200).json({
          success: true,
          message:
            estado === 0 ? 'Servicio finalizado exitosamente' : 'Servicio activado exitosamente'
        });
      }

      // Lógica para actualización completa del servicio (nuevo)
      if (precio_servicio !== undefined && precio_habitacion !== undefined && metodo_pago !== undefined && tiempo !== undefined) {
        // Obtener datos actuales del servicio
        const [curr] = (await query(
          'SELECT precio_servicio, precio_habitacion, iva, total, habitacion_id, caja_id, metodo_pago FROM servicios WHERE id_servicio = ?',
          [servicioId]
        )) as any[];

        if (!curr) {
          return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        const newPrice = Number(precio_servicio);
        const newHabPrice = Number(precio_habitacion);
        const newIva = Number(iva || 0);
        const newTotal = Number(total);
        const newTime = Number(tiempo);

        // Calcular diferencias para actualizar caja
        const totalDiff = newTotal - Number(curr.total);
        const ivaDiff = newIva - Number(curr.iva);

        await withTransaction(async (connection) => {
          // 1. Actualizar servicio
          await query(
            'UPDATE servicios SET precio_servicio = ?, precio_habitacion = ?, iva = ?, sub_total = ?, total = ?, tiempo = ?, metodo_pago = ? WHERE id_servicio = ?',
            [newPrice, newHabPrice, newIva, sub_total, newTotal, newTime, metodo_pago, servicioId]
          );

          // 2. Actualizar comisiones si el precio del servicio cambió
          const priceDiff = newPrice - Number(curr.precio_servicio);
          if (priceDiff !== 0) {
            // Obtener anfitrionas del servicio
            const anfitrionas = (await query(
              'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
              [servicioId]
            )) as any[];

            if (anfitrionas.length > 0) {
              // Obtener comision de habitacion
              const [habitacion] = (await query('SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [curr.habitacion_id])) as any[];
              const comisionHab = Number(habitacion?.comision_anfitriona || 0);

              const comisionServicioBase = Math.floor(newPrice / anfitrionas.length);
              const comisionTotalIndiv = comisionServicioBase + Math.floor(comisionHab / anfitrionas.length);

              // Actualizar comisiones existentes
              const comisionesExistentes = (await query('SELECT id_comision FROM comisiones WHERE servicio_id = ?', [servicioId])) as any[];

              for (let i = 0; i < anfitrionas.length; i++) {
                const userId = anfitrionas[i].usuario_id;
                const [detalleExistente] = (await query(
                  'SELECT comision_id FROM detalle_comisiones WHERE usuario_id = ? AND comision_id IN (SELECT id_comision FROM comisiones WHERE servicio_id = ?)',
                  [userId, servicioId]
                )) as any[];

                if (detalleExistente) {
                  const comId = detalleExistente.comision_id;
                  await query('UPDATE comisiones SET monto = ? WHERE id_comision = ?', [comisionTotalIndiv, comId]);
                  await query('UPDATE detalle_comisiones SET comision = ? WHERE comision_id = ? AND usuario_id = ?', [comisionTotalIndiv, comId, userId]);
                }
              }
            }
          }

          // 3. Actualizar caja si hay diferencias y cambió el método de pago
          if (curr.caja_id && (totalDiff !== 0 || curr.metodo_pago !== metodo_pago)) {
            // Restar del método anterior
            let oldPayCol = 'efectivo';
            if (curr.metodo_pago === 'tarjeta') oldPayCol = 'tarjeta';
            else if (curr.metodo_pago === 'transferencia') oldPayCol = 'transferencia';

            // Sumar al método nuevo
            let newPayCol = 'efectivo';
            if (metodo_pago === 'tarjeta') newPayCol = 'tarjeta';
            else if (metodo_pago === 'transferencia') newPayCol = 'transferencia';

            if (curr.metodo_pago !== metodo_pago) {
              // Cambió el método de pago: restar del anterior y sumar al nuevo
              await query(
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
              // Mismo método de pago: solo actualizar diferencias
              await query(
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

      // Lógica para actualizar precio y tiempo solamente (existente)
      if (precio_servicio !== undefined || tiempo !== undefined) {
        // Obtener datos actuales del servicio para cálculos
        const [curr] = (await query(
          'SELECT precio_servicio, precio_habitacion, iva, total, habitacion_id, caja_id FROM servicios WHERE id_servicio = ?',
          [servicioId]
        )) as any[];

        if (!curr) {
          return res.status(404).json({ success: false, message: 'Servicio no encontrado' });
        }

        const newPrice = precio_servicio !== undefined ? Number(precio_servicio) : Number(curr.precio_servicio);
        const newTime = tiempo !== undefined ? Number(tiempo) : Number(curr.tiempo);

        // Recalcular sub_total (es el precio de servicio) y total
        const sub_total = newPrice;
        // El total en el front se calcula como: nuevoSubTotal + precioHabitacionTotal + formData.iva
        // Recuperamos el precio_habitacion (que ya es el total por chicas en la tabla servicios)
        const total = sub_total + Number(curr.precio_habitacion) + Number(curr.iva);

        // Diferencias para actualizar caja
        const priceDiff = newPrice - Number(curr.precio_servicio);
        const totalDiff = total - Number(curr.total);

        await withTransaction(async (connection) => {
          // 1. Actualizar servicio
          await query(
            'UPDATE servicios SET precio_servicio = ?, sub_total = ?, total = ?, tiempo = ? WHERE id_servicio = ?',
            [newPrice, sub_total, total, newTime, servicioId]
          );

          // 2. Si el precio cambió, actualizar comisiones
          if (priceDiff !== 0) {
            // Obtener anfitrionas del servicio
            const anfitrionas = (await query(
              'SELECT usuario_id FROM detalle_servicios WHERE servicio_id = ?',
              [servicioId]
            )) as any[];

            if (anfitrionas.length > 0) {
              // Obtener comision de habitacion
              const [habitacion] = (await query('SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [curr.habitacion_id])) as any[];
              const comisionHab = Number(habitacion?.comision_anfitriona || 0);

              const comisionServicioBase = Math.floor(newPrice / anfitrionas.length);
              const comisionTotalIndiv = comisionServicioBase + Math.floor(comisionHab / anfitrionas.length);

              // Actualizar tabla comisiones y detalle_comisiones
              // Nota: esto asume que ya existen registros de comisiones para este servicio
              // Buscamos las comisiones existentes ligadas a este servicio
              const comisionesExistentes = (await query('SELECT id_comision FROM comisiones WHERE servicio_id = ?', [servicioId])) as any[];

              for (let i = 0; i < anfitrionas.length; i++) {
                const userId = anfitrionas[i].usuario_id;
                // Intentar encontrar la comision para este usuario
                const [detalleExistente] = (await query(
                  'SELECT comision_id FROM detalle_comisiones WHERE usuario_id = ? AND comision_id IN (SELECT id_comision FROM comisiones WHERE servicio_id = ?)',
                  [userId, servicioId]
                )) as any[];

                if (detalleExistente) {
                  const comId = detalleExistente.comision_id;
                  await query('UPDATE comisiones SET monto = ? WHERE id_comision = ?', [comisionTotalIndiv, comId]);
                  await query('UPDATE detalle_comisiones SET comision = ? WHERE comision_id = ? AND usuario_id = ?', [comisionTotalIndiv, comId, userId]);
                }
              }

              // 3. Actualizar caja si hay diferencia
              if (curr.caja_id) {
                const comisionTotalDiff = priceDiff; // La parte de habitacion no cambia, solo la de servicio

                // Determinar que columna de caja incrementar basado en el metodo de pago (asumimos el actual)
                const [serv] = (await query('SELECT metodo_pago FROM servicios WHERE id_servicio = ?', [servicioId])) as any[];
                const metodo = serv?.metodo_pago || 'efectivo';

                let payCol = 'efectivo';
                if (metodo === 'tarjeta') payCol = 'tarjeta';
                else if (metodo === 'transferencia') payCol = 'transferencia';

                await query(
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
