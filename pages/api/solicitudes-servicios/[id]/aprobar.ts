import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '../../notifications/sse';
import { withTransaction } from '@/lib/transactionUtils';
import { sendPushNotification } from '@/lib/pushNotifications';

// Función para generar código único
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  const { id } = req.query;
  const { habitacion_id: habitacionIdOverride } = req.body || {};
  // @ts-ignore
  const userId = req.user?.id;
  // @ts-ignore
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
  }

  // Verificar que el usuario sea cajero o administrador
  const roleLower = (userRole || '').toLowerCase();
  if (roleLower !== 'cajero' && roleLower !== 'administrador') {
    return res.status(403).json({
      success: false,
      message: 'No tienes permisos para aprobar solicitudes'
    });
  }

  try {
    const result = await withTransaction(async (connection) => {
      // 1. Obtener la solicitud
      const solicitudes = await query(
        'SELECT * FROM solicitudes_servicios WHERE id_solicitud = ? FOR UPDATE',
        [id]
      ) as any[];

      if (solicitudes.length === 0) {
        throw new Error('Solicitud no encontrada');
      }

      const solicitud = solicitudes[0];
      if (solicitud.estado !== 'pendiente') {
        throw new Error('Esta solicitud ya ha sido procesada');
      }

      const habitacionIdFinal = habitacionIdOverride || solicitud.habitacion_id;
      const anfitrionasIds = typeof solicitud.anfitrionas_ids === 'string'
        ? JSON.parse(solicitud.anfitrionas_ids)
        : solicitud.anfitrionas_ids;

      const codigo = solicitud.codigo || generateUniqueCode();

      // 2. Obtener caja abierta
      const cajaAbiertaResult = (await query(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      )) as any[];
      const cajaId = cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

      if (!cajaId) {
        throw new Error('No hay una caja abierta para procesar este servicio.');
      }

      // 3. Cálculos de precios y comisiones
      const numAnfitrionas = anfitrionasIds.length;
      const numClientes = Math.max(1, solicitud.num_clientes || 1);
      const tiempo = Number(solicitud.tiempo || 0);
      const multiplicador = tiempo === 60 ? 2 : 1;
      const tieneComision = (solicitud.comision_anfitriona || 0) > 0;

      const precioServicioBase = tieneComision ? 0 : (solicitud.precio_servicio || 0);
      const precioServicioIndividual = precioServicioBase * multiplicador;
      const precioHabitacionBase = solicitud.precio_habitacion || 0;

      let precioHabitacionTotal;
      if (tieneComision) {
        precioHabitacionTotal = precioHabitacionBase * numClientes * multiplicador;
      } else {
        precioHabitacionTotal = precioHabitacionBase * numAnfitrionas * multiplicador;
      }

      const subTotal = precioServicioIndividual * numAnfitrionas;
      let ivaFinal = 0;
      let totalFinal = subTotal + precioHabitacionTotal;

      if (!tieneComision && solicitud.metodo_pago?.toLowerCase() === 'tarjeta') {
        ivaFinal = Math.floor(subTotal * 0.2);
        totalFinal = subTotal + precioHabitacionTotal + ivaFinal;
        const totalRedondeado = Math.ceil(totalFinal / 5000) * 5000;
        const excedente = totalRedondeado - totalFinal;
        ivaFinal += excedente;
        totalFinal = totalRedondeado;
      }

      let comisionPorAnfitriona = 0;
      if (tieneComision && numAnfitrionas > 0) {
        comisionPorAnfitriona = Math.floor(solicitud.comision_anfitriona / numAnfitrionas);
      }

      const fechaActual = new Date();
      const fechaActualSql = fechaActual.toISOString().slice(0, 19).replace('T', ' ');

      // 4. Crear el servicio
      const resultServicio: any = await query(
        `INSERT INTO servicios 
        (codigo, cliente_id, habitacion_id, precio_servicio, precio_habitacion, 
         iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)`,
        [
          codigo,
          solicitud.cliente_id || null,
          habitacionIdFinal,
          precioServicioIndividual * numAnfitrionas, // Guardar total de servicio
          precioHabitacionBase,
          ivaFinal,
          subTotal,
          totalFinal,
          tiempo, // Usar la variable numérica
          solicitud.metodo_pago,
          cajaId,
          userId,
          fechaActualSql // Usar la misma fecha que devolveremos
        ]
      );

      const servicioId = resultServicio.insertId;

      // 5. Detalles de clientes y anfitrionas
      if (solicitud.cliente_id) {
        await query(
          'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
          [servicioId, solicitud.cliente_id]
        );
      }

      for (const anfitrionaId of anfitrionasIds) {
        await query(
          'INSERT INTO detalle_servicios (usuario_id, servicio_id, comision) VALUES (?, ?, ?)',
          [anfitrionaId, servicioId, comisionPorAnfitriona]
        );
        // Ocupar anfitriona
        await query('UPDATE usuarios SET estado = 2 WHERE id_usuario = ?', [anfitrionaId]);
      }

      // 6. Pausar otros servicios si es necesario
      if (anfitrionasIds.length > 0) {
        const placeholders = anfitrionasIds.map(() => '?').join(',');
        const queryServiciosToPause = `
          SELECT DISTINCT s.id_servicio
          FROM servicios s
          JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
          JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
          WHERE s.estado = 1 
            AND s.id_servicio != ? 
            AND s.paused_at IS NULL 
            AND ds.usuario_id IN (${placeholders})
            AND (h.precio > 0 OR h.comision_anfitriona > 0 OR h.tiempo > 0)
        `;
        const params = [servicioId, ...anfitrionasIds];
        const serviciosToPause = await query(queryServiciosToPause, params) as any[];

        for (const sToPause of serviciosToPause) {
          await query('UPDATE servicios SET paused_at = ? WHERE id_servicio = ?', [fechaActualSql, sToPause.id_servicio]);
          sendNotificationToAll('timer_paused', {
            servicioId: sToPause.id_servicio,
            tipoTransaccion: 'servicio'
          });
        }
      }

      // 7. Ocupar habitación
      const roomInfo = (await query('SELECT nombre, precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacionIdFinal])) as any[];
      let habitacionNombre = `Habitación ${habitacionIdFinal}`;
      if (roomInfo.length > 0) {
        const room = roomInfo[0];
        habitacionNombre = room.nombre;
        const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
        if (!isFreeRoom) {
          await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [habitacionIdFinal]);
        }
      }

      // 8. Actualizar solicitud
      await query(
        `UPDATE solicitudes_servicios 
         SET estado = 'aprobada', procesado_por = ?, fecha_procesamiento = ?, habitacion_id = ? 
         WHERE id_solicitud = ?`,
        [userId, fechaActualSql, habitacionIdFinal, id]
      );

      // 9. Obtener nombres de anfitrionas para la respuesta
      const anfitrionasData = (await query(
        `SELECT nick, nombre FROM usuarios WHERE id_usuario IN (${anfitrionasIds.map(() => '?').join(',')})`,
        anfitrionasIds
      )) as any[];
      const anfitrionasNicks = anfitrionasData.map(u => u.nick || u.nombre).join(', ');

      // 10. Obtener nombre del cliente
      let clienteNombre = 'Cliente sin registrar';
      if (solicitud.cliente_id) {
        const clienteData = (await query('SELECT nombre, apellido FROM clientes WHERE id_cliente = ?', [solicitud.cliente_id])) as any[];
        if (clienteData.length > 0) {
          clienteNombre = `${clienteData[0].nombre} ${clienteData[0].apellido}`;
        }
      }

      return {
        servicioId,
        codigo,
        habitacionId: habitacionIdFinal,
        habitacionNombre,
        tiempo: tiempo,
        clienteNombre,
        anfitrionasNicks,
        startTime: fechaActual.toISOString(),
        precio_servicio: precioServicioIndividual * numAnfitrionas,
        precio_habitacion: precioHabitacionBase,
        iva: ivaFinal,
        total: totalFinal,
        metodo_pago: solicitud.metodo_pago,
        solicitado_por: solicitud.solicitado_por,
        anfitrionas_ids: anfitrionasIds
      };
    });

    // Enviar notificaciones fuera de la transacción para no bloquear
    sendNotificationToAll('service_request_approved', {
      id_solicitud: id,
      servicio_id: result.servicioId,
      timestamp: new Date().toISOString()
    });

    sendNotificationToAll('timer_started', {
      servicioId: result.servicioId,
      codigo: result.codigo,
      roomId: result.habitacionId,
      roomName: result.habitacionNombre,
      duration: result.tiempo,
      startTime: result.startTime,
      clienteNombre: result.clienteNombre,
      anfitrionas: result.anfitrionasNicks,
      tipoTransaccion: 'servicio',
      precio_servicio: result.precio_servicio,
      precio_habitacion: result.precio_habitacion,
      iva: result.iva,
      total: result.total,
      metodo_pago: result.metodo_pago,
      waiter_name: roleLower === 'administrador' ? 'Admin' : 'Cajero',
      created_at: result.startTime
    });

    // Enviar notificaciones PUSH a los involucrados
    try {
      // 1. Al solicitante (Garzon/Anfitriona)
      if (result.solicitado_por) {
        sendPushNotification(
          result.solicitado_por,
          '¡SOLICITUD APROBADA!',
          `Tu solicitud para ${result.habitacionNombre} ha sido aprobada. El tiempo ha comenzado.`,
          { type: 'service_request_approved', id_solicitud: id }
        );
      }

      // 2. A las anfitrionas asignadas
      if (result.anfitrionas_ids && result.anfitrionas_ids.length > 0) {
        sendPushNotification(
          result.anfitrionas_ids,
          '¡NUEVO SERVICIO!',
          `Has sido asignada a un servicio en ${result.habitacionNombre}.`,
          { type: 'service_request_approved', id_solicitud: id }
        );
      }
    } catch (pushErr) {
      console.error('[APROBAR SOLICITUD] Error enviando notificaciones push:', pushErr);
    }

    return res.status(200).json({
      success: true,
      message: 'Solicitud aprobada exitosamente',
      data: {
        servicio_id: result.servicioId,
        codigo: result.codigo,
        habitacion_nombre: result.habitacionNombre,
        cliente_nombre: result.clienteNombre,
        anfitrionas: result.anfitrionasNicks,
        tiempo: result.tiempo
      }
    });

  } catch (error: any) {
    console.error('Error al aprobar solicitud:', error);
    return res.status(error.message === 'Solicitud no encontrada' ? 404 : 500).json({
      success: false,
      message: error.message || 'Error al aprobar solicitud'
    });
  }
};

export default withAuth(handler);
