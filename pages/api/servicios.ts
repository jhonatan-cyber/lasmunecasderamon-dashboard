/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { all, caja_id, limit = '50', page = '1' } = req.query;
      const limitNum = parseInt(limit as string);
      const pageNum = parseInt(page as string);
      const offset = (pageNum - 1) * limitNum;

      let whereClause = '';
      const params: any[] = [];

      if (all === 'true') {
        // Mostrar solo servicios finalizados (estado 1)
        whereClause = 'WHERE s.estado = 1';
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

      // Query params logged for reference without hitting DB extra times
      // console.log('[API /servicios] Query params:', { all, caja_id, limit, page });

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
           GROUP_CONCAT(DISTINCT ds.usuario_id SEPARATOR ',') as anfitrionas_ids,
           GROUP_CONCAT(DISTINCT u.foto SEPARATOR ',') as anfitrionas_fotos,
          creator.nombre as creator_nombre,
          creator.apellido as creator_apellido,
          creator.nick as usuario_nick,
          creator.foto as creator_foto,
          (
            SELECT IF(COUNT(dc_inner.id_detalle_comision) > 0 AND SUM(dc_inner.estado) = 0, 0, 1)
            FROM comisiones c_inner 
            JOIN detalle_comisiones dc_inner ON dc_inner.comision_id = c_inner.id_comision
            WHERE c_inner.servicio_id = s.id_servicio
          ) as pago_estado,
          CONCAT(solicitante.nombre, ' ', solicitante.apellido) as solicitante_name,
          solicitante.foto as solicitante_foto,
          AVG(ds.comision) as comision_individual
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN detalle_servicios_clientes dsc ON dsc.servicio_id = s.id_servicio
        LEFT JOIN clientes c_multi ON c_multi.id_cliente = dsc.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        LEFT JOIN usuarios creator ON creator.id_usuario = s.created_by
        LEFT JOIN solicitudes_servicios ss ON s.codigo = ss.codigo
        LEFT JOIN usuarios solicitante ON solicitante.id_usuario = ss.solicitado_por
        ${whereClause}
        GROUP BY s.id_servicio
        ORDER BY s.fecha_crea DESC
        LIMIT ? OFFSET ?
      `,
        [...params, limitNum, offset]
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

      const now = getNowInBusinessTimezone();
      const result = await withTransaction(async connection => {
        
        // 0. Si el método de pago es prepago, verificar y descontar saldo
        if (metodo_pago === 'prepago') {
          if (!clienteIdFinal) {
            throw new Error('Se requiere seleccionar un cliente registrado para pagar con saldo prepago');
          }

          const clienteData = (await connection('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [clienteIdFinal])) as any[];
          if (clienteData.length === 0) {
            throw new Error('Cliente no encontrado');
          }

          const saldoActual = clienteData[0].saldo || 0;
          if (saldoActual < totalFinal) {
            throw new Error(`Saldo insuficiente. Saldo disponible: ${saldoActual.toLocaleString('es-CL')}, Total servicio: ${totalFinal.toLocaleString('es-CL')}`);
          }

          // Descontar saldo
          await connection('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [totalFinal, clienteIdFinal]);

          // Buscar información para los metadatos
          const [roomRow] = (await connection('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [habitacion_id])) as any[];
          const hostessesRows = usuarios && usuarios.length > 0 
            ? (await connection(`SELECT nick FROM usuarios WHERE id_usuario IN (${usuarios.map(() => '?').join(',')})`, usuarios)) as any[]
            : [];
          
          const metadatos = JSON.stringify({
            habitacion: roomRow?.nombre || 'S/N',
            tiempo: tiempo,
            anfitrionas: hostessesRows.map(h => h.nick).filter(Boolean)
          });

          // Registrar movimiento de consumo con metadatos detallados
          await connection(
            `INSERT INTO clientes_prepago_movimientos 
            (id_movimiento, cliente_id, tipo, monto, venta_id, usuario_id, fecha_crea, metadatos) 
            VALUES (?, ?, 'CONSUMO', ?, NULL, ?, ?, ?)`,
            [generateUUID(), clienteIdFinal, totalFinal, createdBy, now, metadatos]
          );
        }
        // 1. Insertar servicio
        const servicioId = generateUUID();
        await connection(
          `INSERT INTO servicios (id_servicio, codigo, cliente_id, habitacion_id, precio_habitacion, precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)`,
          [
            servicioId,
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
            createdBy,
            now
          ]
        );

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
              'INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES (?, ?, ?)',
              [generateUUID(), servicioId, cId]
            );
          }
        } else if (clienteIdFinal) {
          await connection(
            'INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES (?, ?, ?)',
            [generateUUID(), servicioId, clienteIdFinal]
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

        let finalComision = 0;
        if (numAnfitrionas > 0) {
          // REGLA: Si la habitación tiene comisión fija, se divide entre las anfitrionas.
          // Si no, la comisión es el precio neto del servicio por cada anfitriona.
          if (tieneComisionRoom) {
            finalComision = Math.floor(comisionHabitacionBase / numAnfitrionas);
          } else {
            const precioNetoServicio = subTotalNum - precioHabitacionOriginal;
            finalComision = Math.floor(precioNetoServicio / numAnfitrionas);
          }

          for (const uId of usuarios) {
            if (finalComision > 0) {
              const comisionId = generateUUID();
              await connection(
                `INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto, estado) VALUES (?, null, ?, ?, 1)`,
                [comisionId, servicioId, finalComision]
              );
              await connection(
                `INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado) VALUES (?, ?, ?, ?, 1)`,
                [generateUUID(), comisionId, uId, finalComision]
              );
            }
            await connection(
              'INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision) VALUES (?, ?, ?, ?)',
              [generateUUID(), uId, servicioId, Math.max(0, finalComision)]
            );
            await connection('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [uId]);
          }
        }

        // 6. Caja
        if (cajaId) {
          let mEf = 0, mTa = 0, mTr = 0, mPr = 0;
          if (metodo_pago === 'tarjeta') mTa = totalFinal;
          else if (metodo_pago === 'transferencia') mTr = totalFinal;
          else if (metodo_pago === 'prepago') mPr = totalFinal;
          else mEf = totalFinal;

          await connection(
            `UPDATE cajas SET servicio = servicio + ?, efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?, prepago = prepago + ?, iva = iva + ?, comision = comision + ? WHERE id_caja = ?`,
            [totalFinal - ivaFinal, mEf, mTa, mTr, mPr, ivaFinal, tieneComisionRoom ? comisionHabitacionBase : (finalComision * numAnfitrionas), cajaId]
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
          startTime: s.startTime instanceof Date ? s.startTime.toISOString() : s.startTime,
          created_at: s.created_at instanceof Date ? s.created_at.toISOString() : s.created_at,
          duration: Number(s.duration),
          waiter_name: result.createdBy,
          tipoTransaccion: 'servicio',
          anfitrionas_ids: result.anfitrionasIds
        });

        // SSE: User status updated for each anfitriona
        if (result.anfitrionasIds?.length > 0) {
          result.anfitrionasIds.forEach((uId: string) => {
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

