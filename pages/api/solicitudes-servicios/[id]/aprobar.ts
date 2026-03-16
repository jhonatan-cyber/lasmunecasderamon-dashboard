import { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
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
    const result = await withTransaction(async connection => {
      // 1. Obtener la solicitud
      const solicitudes = (await connection(
        'SELECT * FROM solicitudes_servicios WHERE id_solicitud = ? FOR UPDATE',
        [id]
      )) as any[];

      if (solicitudes.length === 0) {
        throw new Error('Solicitud no encontrada');
      }

      const solicitud = solicitudes[0];
      if (solicitud.estado !== 'pendiente') {
        throw new Error('Esta solicitud ya ha sido procesada');
      }

      const habitacionIdFinal = habitacionIdOverride || solicitud.habitacion_id;
      const anfitrionasIds =
        typeof solicitud.anfitrionas_ids === 'string'
          ? JSON.parse(solicitud.anfitrionas_ids)
          : solicitud.anfitrionas_ids;

      const codigo = solicitud.codigo || generateUniqueCode();

      // 2. Obtener caja abierta
      const cajaAbiertaResult = (await connection(
        'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
      )) as any[];
      const cajaId =
        cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

      if (!cajaId) {
        throw new Error('No hay una caja abierta para procesar este servicio.');
      }

      // 3. Cálculos de precios y comisiones
      const numAnfitrionas = anfitrionasIds.length;
      const numClientes = Math.max(1, solicitud.num_clientes || 1);
      const tiempo = Number(solicitud.tiempo || 0);
      const multiplicador = tiempo === 60 ? 2 : 1;
      const tieneComision = (solicitud.comision_anfitriona || 0) > 0;

      const precioServicioBase = solicitud.precio_servicio || 0;
      const precioServicioIndividual = precioServicioBase * multiplicador;
      const precioHabitacionBase = solicitud.precio_habitacion || 0;

      let precioHabitacionTotal;
      if (tieneComision) {
        precioHabitacionTotal = precioHabitacionBase * numClientes * multiplicador;
      } else {
        precioHabitacionTotal = precioHabitacionBase * numAnfitrionas * multiplicador;
      }

      // subTotal Neto (Servicios + Habitación)
      // precioServicioIndividual ya tiene multiplicado el tiempo (ej. 5k base * 2h = 10k)
      // numAnfitrionas multiplica eso por la cantidad de chicas (ej. 10k individual * 1 chica = 10k total serv)
      const subTotalNeto = (precioServicioIndividual * numAnfitrionas) + precioHabitacionTotal;
      let ivaFinal = tieneComision ? 0 : Number(solicitud.iva || 0);
      let totalFinal = subTotalNeto + ivaFinal;

      if (!tieneComision && solicitud.metodo_pago?.toLowerCase() === 'tarjeta') {
        // Si es tarjeta y no venía el IVA, lo calculamos al 20% sobre el servicio neto
        if (!ivaFinal) ivaFinal = Math.floor((precioServicioIndividual * numAnfitrionas) * 0.2);

        totalFinal = subTotalNeto + ivaFinal;
        const totalRedondeado = Math.ceil(totalFinal / 5000) * 5000;
        const excedente = totalRedondeado - totalFinal;
        ivaFinal += excedente;
        totalFinal = totalRedondeado;
      }

      let comisionPorAnfitriona = 0;
      if (numAnfitrionas > 0) {
        // REGLA: Si tiene comisión fija de habitación, se divide entre las anfitrionas. 
        // Si es servicio manual (no tiene comisión de habitación), se usa el precio del servicio por chica.
        if (tieneComision) {
          comisionPorAnfitriona = Math.floor(Number(solicitud.comision_anfitriona || 0) / numAnfitrionas);
        } else {
          comisionPorAnfitriona = precioServicioIndividual;
        }
      }

      // 4. Crear el servicio
      const servicioId = generateUUID();
      await connection(
        `INSERT INTO servicios 
        (id_servicio, codigo, cliente_id, habitacion_id, precio_servicio, precio_habitacion, 
         iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, NOW())`,
        [
          servicioId,
          codigo,
          solicitud.cliente_id || null,
          habitacionIdFinal,
          precioServicioIndividual * numAnfitrionas, // Guardar total de servicio (Neto)
          precioHabitacionTotal, // Guardar total de habitación (Neto)
          ivaFinal,
          subTotalNeto, // sub_total de la tabla es la suma de netos
          totalFinal,
          tiempo, // Usar la variable numérica
          solicitud.metodo_pago,
          cajaId,
          userId
        ]
      );

      // Obtener la fecha real de creación desde el servidor DB para el timer
      const [fechaCreaResult]: any = await connection(
        'SELECT fecha_crea FROM servicios WHERE id_servicio = ?',
        [servicioId]
      );
      const dbFechaCrea = fechaCreaResult?.fecha_crea || new Date();

      // 5. Detalles de clientes y anfitrionas
      if (solicitud.cliente_id) {
        await connection(
          'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
          [servicioId, solicitud.cliente_id]
        );
      }

      for (const anfitrionaId of anfitrionasIds) {
        await connection(
          'INSERT INTO detalle_servicios (usuario_id, servicio_id, comision) VALUES (?, ?, ?)',
          [anfitrionaId, servicioId, comisionPorAnfitriona]
        );

        // Registrar comisiones si son mayores a 0
        if (comisionPorAnfitriona > 0) {
          const comisionId = generateUUID();
          await connection(
            'INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto) VALUES (?, ?, ?, ?)',
            [comisionId, null, servicioId, comisionPorAnfitriona]
          );
          await connection(
            'INSERT INTO detalle_comisiones (comision_id, usuario_id, comision) VALUES (?, ?, ?)',
            [comisionId, anfitrionaId, comisionPorAnfitriona]
          );
        }

        // Ocupar anfitriona
        await connection('UPDATE usuarios SET estado_servicio = 2 WHERE id_usuario = ?', [anfitrionaId]);
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
        const serviciosToPause = (await connection(queryServiciosToPause, params)) as any[];

        for (const sToPause of serviciosToPause) {
          await connection('UPDATE servicios SET paused_at = NOW() WHERE id_servicio = ?', [
            sToPause.id_servicio
          ]);
          sendNotificationToAll('timer_paused', {
            servicioId: sToPause.id_servicio,
            tipoTransaccion: 'servicio'
          });
        }
      }

      // 7. Ocupar habitación
      const roomInfo = (await connection(
        'SELECT nombre, precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
        [habitacionIdFinal]
      )) as any[];
      let habitacionNombre = `Habitación ${habitacionIdFinal}`;
      if (roomInfo.length > 0) {
        const room = roomInfo[0];
        habitacionNombre = room.nombre;
        const isFreeRoom =
          !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
        if (!isFreeRoom) {
          await connection('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [
            habitacionIdFinal
          ]);
        }
      }

      // 8. Actualizar solicitud
      await connection(
        `UPDATE solicitudes_servicios 
         SET estado = 'aprobada', procesado_por = ?, fecha_procesamiento = NOW(), habitacion_id = ? 
         WHERE id_solicitud = ?`,
        [userId, habitacionIdFinal, id]
      );

      // 9. Actualizar Caja
      let montoEfectivo = 0;
      let montoTarjeta = 0;
      let montoTransferencia = 0;

      const metodoPago = (solicitud.metodo_pago || 'efectivo').toLowerCase();
      switch (metodoPago) {
        case 'efectivo':
          montoEfectivo = totalFinal;
          break;
        case 'tarjeta':
          montoTarjeta = totalFinal;
          break;
        case 'transferencia':
          montoTransferencia = totalFinal;
          break;
        default:
          montoEfectivo = totalFinal;
      }

      await connection(
        `UPDATE cajas SET 
          servicio = servicio + ?,
          efectivo = efectivo + ?,
          tarjeta = tarjeta + ?,
          transferencia = transferencia + ?,
          iva = iva + ?,
          comision = comision + ?
        WHERE id_caja = ?`,
        [
          totalFinal - ivaFinal,
          montoEfectivo,
          montoTarjeta,
          montoTransferencia,
          ivaFinal,
          Number(solicitud.comision_anfitriona || 0) + (tieneComision ? 0 : comisionPorAnfitriona * numAnfitrionas),
          cajaId
        ]
      );

      // 10. Obtener nombres de anfitrionas para la respuesta
      const anfitrionasData = (await connection(
        `SELECT nick, nombre FROM usuarios WHERE id_usuario IN (${anfitrionasIds.map(() => '?').join(',')})`,
        anfitrionasIds
      )) as any[];
      const anfitrionasNicks = anfitrionasData.map(u => u.nick || u.nombre).join(', ');

      // 11. Obtener nombre del cliente
      let clienteNombre = 'Cliente sin registrar';
      if (solicitud.cliente_id) {
        const clienteData = (await connection(
          'SELECT nombre, apellido FROM clientes WHERE id_cliente = ?',
          [solicitud.cliente_id]
        )) as any[];
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
        startTime: dbFechaCrea instanceof Date ? dbFechaCrea.toISOString() : dbFechaCrea,
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
