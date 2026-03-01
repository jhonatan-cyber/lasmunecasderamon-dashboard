import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { all, caja_id } = req.query;
      let whereClause = '';
      const params: any[] = [];

      if (all === 'true') {
        // Mostrar solo servicios finalizados (estado 1)
        // TEMPORAL: También incluir estado 0 para servicios antiguos que aún no se han migrado
        whereClause = 'WHERE (s.estado = 1 OR s.estado = 0)';
      } else if (all === 'false') {
        // Mostrar servicios activos (2: En Proceso, 3: Pausado, 4: Solicitud de Anulación)
        whereClause = 'WHERE s.estado IN (2, 3, 4)';
      }

      // Filtrar directamente por caja_id si se proporciona
      if (caja_id) {
        whereClause += whereClause ? ' AND s.caja_id = ?' : 'WHERE s.caja_id = ?';
        params.push(caja_id);
      }

      // Si no se especifica 'all', mostrar todos los servicios sin filtro

      console.log('[API /servicios] Query params:', { all, caja_id });
      console.log('[API /servicios] WHERE clause:', whereClause);
      console.log('[API /servicios] Params:', params);

      // Query de debug para ver todos los servicios
      const todosServicios = (await query(
        'SELECT id_servicio, codigo, estado, caja_id FROM servicios ORDER BY id_servicio DESC LIMIT 10'
      )) as any[];
      console.log(
        '[API /servicios] DEBUG - Últimos 10 servicios:',
        JSON.stringify(todosServicios, null, 2)
      );

      // Query adicional para ver servicios con caja_id = 1
      if (caja_id) {
        const serviciosCaja = (await query(
          'SELECT id_servicio, codigo, estado, caja_id FROM servicios WHERE caja_id = ? ORDER BY id_servicio DESC LIMIT 10',
          [caja_id]
        )) as any[];
        console.log(
          '[API /servicios] DEBUG - Servicios con caja_id =',
          caja_id,
          ':',
          JSON.stringify(serviciosCaja, null, 2)
        );

        // Contar servicios por estado en esta caja
        const countByEstado = (await query(
          'SELECT estado, COUNT(*) as count FROM servicios WHERE caja_id = ? GROUP BY estado',
          [caja_id]
        )) as any[];
        console.log(
          '[API /servicios] DEBUG - Count por estado en caja',
          caja_id,
          ':',
          JSON.stringify(countByEstado, null, 2)
        );
      }

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
          COALESCE(GROUP_CONCAT(DISTINCT CONCAT(c_multi.nombre, ' ', c_multi.apellido) SEPARATOR ', '), COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado')) as cliente_nombre,
          h.nombre as habitacion_numero,
          h.comision_anfitriona as habitacion_comision,
          COUNT(DISTINCT ds.usuario_id) as total_usuarios,
          GROUP_CONCAT(DISTINCT
            CASE
              WHEN u.nick IS NOT NULL AND u.nick != '' THEN u.nick
              ELSE CONCAT(u.nombre, ' ', u.apellido)
            END
            SEPARATOR ', '
          ) as anfitrionas_nombres,
          CONCAT(creator.nombre, ' ', creator.apellido) as creator_name,
          creator.nick as usuario_nick
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN detalle_servicios_clientes dsc ON dsc.servicio_id = s.id_servicio
        LEFT JOIN clientes c_multi ON c_multi.id_cliente = dsc.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
        ${whereClause}
        GROUP BY s.id_servicio
        ORDER BY s.fecha_crea DESC
      `,
        params
      )) as any[];

      console.log('[API /servicios] Servicios encontrados:', servicios.length);
      if (servicios.length > 0) {
        console.log('[API /servicios] Primer servicio:', JSON.stringify(servicios[0], null, 2));
      }

      return res.status(200).json({
        success: true,
        data: servicios
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener servicios'
      });
    }
  } else if (req.method === 'POST') {
    try {
      const currentUser = getCurrentUser(req);
      const createdBy = currentUser?.id || null;

      const {
        cliente_id,
        habitacion_id,
        precio_habitacion,
        precio_servicio,
        iva,
        sub_total,
        total,
        tiempo,
        metodo_pago,
        usuarios,
        clientes: clientesArray
      } = req.body;

      if (precio_servicio === undefined || precio_servicio === null || !tiempo) {
        return res
          .status(400)
          .json({ success: false, message: 'Precio de servicio y tiempo son requeridos' });
      }

      // Validar si el cliente existe
      let clienteIdFinal = null;
      if (cliente_id) {
        const clienteExistsResult = (await query(
          'SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 1',
          [cliente_id]
        )) as any[];
        if (clienteExistsResult?.length > 0) clienteIdFinal = cliente_id;
      }

      // Obtener comisión de la habitación
      let comisionHabitacionBase = 0;
      let tieneComisionRoom = false;
      if (habitacion_id) {
        const hResult = (await query(
          'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
          [habitacion_id]
        )) as any[];
        if (hResult?.length > 0) {
          comisionHabitacionBase = Number(hResult[0].comision_anfitriona || 0);
          tieneComisionRoom = comisionHabitacionBase > 0;
        }
      }

      const codigo = generateUniqueCode();
      const subTotalNum = Number(sub_total || 0);
      const precioHabitacionOriginal = Number(precio_habitacion || 0);
      const numAnfitrionas = usuarios && Array.isArray(usuarios) ? usuarios.length : 1;

      // REGLA IVA
      let ivaFinal = tieneComisionRoom ? 0 : Number(iva || 0);
      let totalFinal = Number(total || 0);

      if (metodo_pago === 'tarjeta' && !tieneComisionRoom) {
        // Recalculamos basándonos en los componentes para asegurar precisión y evitar duplicados
        const precioNetoParaIva = subTotalNum - precioHabitacionOriginal;
        if (!ivaFinal && precioNetoParaIva > 0) ivaFinal = Math.floor(precioNetoParaIva * 0.2);

        const currentTotal = subTotalNum + ivaFinal;
        const totalRedondeado = Math.ceil(currentTotal / 5000) * 5000;
        const excedente = totalRedondeado - currentTotal;
        totalFinal = totalRedondeado;
        ivaFinal += excedente;
      } else {
        // En efectivo o con comisión room, el total es la suma de los componentes
        ivaFinal = tieneComisionRoom ? 0 : Number(iva || 0);
        totalFinal = subTotalNum + ivaFinal;
      }

      const cajaAbiertaResult = (await query(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      )) as any[];
      const cajaId = cajaAbiertaResult?.[0]?.id_caja || null;

      let cajaActualizada = false;

      const result = await withTransaction(async connection => {
        // 1. Insertar servicio
        const servicioResult: any = await connection(
          `INSERT INTO servicios (codigo, cliente_id, habitacion_id, precio_habitacion, precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2)`,
          [
            codigo,
            clienteIdFinal,
            habitacion_id,
            precioHabitacionOriginal,
            precio_servicio,
            ivaFinal,
            subTotalNum,
            totalFinal,
            tiempo,
            metodo_pago || null,
            cajaId,
            createdBy
          ]
        );
        const servicioId = servicioResult.insertId;

        // 2. Ocupar habitación si no es libre
        const roomInfo = (await connection(
          'SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
          [habitacion_id]
        )) as any[];
        if (roomInfo.length > 0) {
          const room = roomInfo[0];
          const isFree =
            !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
          if (!isFree)
            await connection('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [
              habitacion_id
            ]);
        }

        // 3. Clientes
        if (clientesArray?.length > 0) {
          for (const cId of clientesArray) {
            await connection(
              'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
              [servicioId, cId]
            );
          }
        } else if (clienteIdFinal) {
          await connection(
            'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
            [servicioId, clienteIdFinal]
          );
        }

        // 4. Pausar servicios relacionados
        if (usuarios?.length > 0) {
          const placeholders = usuarios.map(() => '?').join(',');
          const sqlPause = `SELECT DISTINCT s.id_servicio FROM servicios s JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id JOIN habitaciones h ON s.habitacion_id = h.id_habitacion WHERE s.estado = 2 AND s.id_servicio != ? AND s.paused_at IS NULL AND ds.usuario_id IN (${placeholders}) AND (h.precio > 0 OR h.comision_anfitriona > 0 OR h.tiempo > 0)`;
          const toPause = (await connection(sqlPause, [servicioId, ...usuarios])) as any[];
          for (const s of toPause) {
            await connection(
              'UPDATE servicios SET estado = 3, paused_at = NOW() WHERE id_servicio = ?',
              [s.id_servicio]
            );
            sendNotificationToAll('timer_paused', {
              servicioId: s.id_servicio,
              tipoTransaccion: 'servicio'
            });
          }
        }

        // 5. Comisiones y usuarios
        let finalComision = 0;
        if (numAnfitrionas > 0) {
          // REGLA: La comisión es solo sobre el precio del servicio
          const precioNetoServicio = subTotalNum - precioHabitacionOriginal;
          finalComision = Math.floor(precioNetoServicio / numAnfitrionas);

          if (finalComision > 0) {
            for (const uId of usuarios) {
              const cRes: any = await connection(
                `INSERT INTO comisiones (venta_id, servicio_id, monto, estado) VALUES (null, ?, ?, 1)`,
                [servicioId, finalComision]
              );
              await connection(
                `INSERT INTO detalle_comisiones (comision_id, usuario_id, comision, estado) VALUES (?, ?, ?, 1)`,
                [cRes.insertId, uId, finalComision]
              );
              await connection(
                'INSERT INTO detalle_servicios (usuario_id, servicio_id, comision) VALUES (?, ?, ?)',
                [uId, servicioId, finalComision]
              );
              await connection('UPDATE usuarios SET estado = 2 WHERE id_usuario = ?', [uId]);
            }
          }
        }

        // 6. Caja
        if (cajaId) {
          let mEf = 0,
            mTa = 0,
            mTr = 0;
          if (metodo_pago === 'tarjeta') mTa = totalFinal;
          else if (metodo_pago === 'transferencia') mTr = totalFinal;
          else mEf = totalFinal;

          await connection(
            `UPDATE cajas SET servicio = servicio + ?, efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?, iva = iva + ?, comision = comision + ? WHERE id_caja = ?`,
            [totalFinal - ivaFinal, mEf, mTa, mTr, ivaFinal, finalComision * numAnfitrionas, cajaId]
          );
          cajaActualizada = true;
        }

        return {
          servicioId,
          finalComision,
          codigo,
          ivaFinal,
          totalFinal,
          createdBy: currentUser?.username || 'Cajero',
          anfitrionasIds: usuarios
        };
      });

      // Fetch full details for SSE
      const fullService = (await query(`
        SELECT
          s.id_servicio,
          s.codigo,
          s.habitacion_id as roomId,
          h.nombre as roomName,
          s.tiempo as duration,
          s.precio_servicio,
          s.precio_habitacion,
          s.iva,
          s.total,
          s.metodo_pago,
          s.fecha_crea as startTime,
          s.fecha_crea as created_at,
          s.estado,
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
      `, [result.servicioId])) as any[];

      if (fullService.length > 0) {
        const s = fullService[0];
        // SSE: Timer started with full data
        sendNotificationToAll('timer_started', {
          ...s,
          duration: Number(s.duration),
          waiter_name: result.createdBy,
          tipoTransaccion: 'servicio',
          anfitrionas_ids: result.anfitrionasIds
        });

        // SSE: User status updated for each anfitriona
        if (result.anfitrionasIds?.length > 0) {
          result.anfitrionasIds.forEach((uId: number) => {
            sendNotificationToAll('user_status_updated', {
              userId: uId,
              status: 2 // Ocupado
            });
          });
        }
      }

      return res.status(201).json({
        success: true,
        data: {
          id_servicio: result.servicioId,
          comision_por_anfitriona: result.finalComision,
          caja_actualizada: cajaActualizada
        }
      });
    } catch (error: any) {
      console.error('Error in POST /servicios:', error);
      return res.status(500).json({ success: false, message: error.message || 'Error interno' });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }
}

// Export with authentication
export default withAuth(handler);

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
