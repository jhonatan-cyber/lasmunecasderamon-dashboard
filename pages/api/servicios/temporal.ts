import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { addServicioLog } from '@/lib/logUtils';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { generateUUID } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método POST no permitido' });
  }

  try {
    // Get current user
    const currentUser = getCurrentUser(req);
    const createdBy = currentUser?.id || null;

    const {
      servicio_original_id, // ID del servicio original (para referencia)
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

    // Validaciones
    if (precio_servicio === undefined || precio_servicio === null || !tiempo) {
      return res.status(400).json({
        success: false,
        message: 'Precio de servicio y tiempo son requeridos'
      });
    }

    if (!usuarios || !Array.isArray(usuarios) || usuarios.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Debe seleccionar al menos una anfitriona'
      });
    }

    // Usar 0 si precio_servicio no se proporciona o es vacío
    const precioServicioFinal = precio_servicio === '' ? 0 : precio_servicio;

    // Validar si el cliente existe antes de insertar, permitir NULL si no existe
    let clienteIdFinal = null;
    if (cliente_id) {
      const clienteExistsSql =
        'SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 1';
      const clienteExistsResult = (await query(clienteExistsSql, [cliente_id])) as any[];

      if (clienteExistsResult && clienteExistsResult.length > 0) {
        clienteIdFinal = cliente_id;
      } else {
        clienteIdFinal = null;
      }
    } else {
      clienteIdFinal = null;
    }

    // Generar código único para el servicio nuevo
    const codigo = generateUniqueCode();

    // Normalizar números para evitar concatenaciones y valores inválidos
    const totalNum = Number(total || 0);
    const ivaNum = Number(iva || 0);
    const subTotalNum = Number(sub_total || 0);

    // Redondear el total a múltiplos de 5000 y sumar excedente al IVA solo si es tarjeta
    let totalFinal = totalNum;
    let ivaFinal = ivaNum;

    if (metodo_pago === 'tarjeta') {
      if (!ivaFinal && subTotalNum) {
        ivaFinal = Math.floor(subTotalNum * 0.2);
      }
      const totalRedondeado = Math.ceil(totalFinal / 5000) * 5000;
      const excedente = totalRedondeado - totalFinal;
      totalFinal = totalRedondeado;
      ivaFinal = ivaFinal + excedente;
    }

    // Obtener la caja abierta actual
    const cajaAbiertaResult = (await query(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];
    const cajaId =
      cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

    let cajaActualizada = false;

    // Crear servicio nuevo usando transacción (igual que un servicio normal)
    const result = await withTransaction(async connection => {
      // Pausar el servicio original si se proporcionó (dentro de la transacción)
      if (servicio_original_id) {
        // Intentar pausar en tabla servicios
        const resS = await connection(
          'UPDATE servicios SET estado = 3, paused_at = NOW() WHERE id_servicio = ?',
          [servicio_original_id]
        );

        // Si no se afectó ninguna fila, intentar posar en tabla ventas
        if ((resS as any).affectedRows === 0) {
          await connection(
            'UPDATE ventas SET estado = 3, paused_at = NOW() WHERE id_venta = ?',
            [servicio_original_id]
          );
          console.log(`[TEMPORAL] Venta original ${servicio_original_id} pausada`);
        } else {
          console.log(`[TEMPORAL] Servicio original ${servicio_original_id} pausado`);
          await addServicioLog(
            servicio_original_id as string,
            'PAUSA',
            'Servicio pausado automáticamente por inicio de servicio temporal (consumo/champaña).',
            currentUser?.id
          );
        }
      }

      let comisionTotalPorAnfitriona = 0;

      const servicioId = generateUUID();

      // Insertar servicio nuevo (completamente normal en BD)
      const servicioResult: any = await connection(
        `INSERT INTO servicios (
           id_servicio, codigo, cliente_id, habitacion_id, precio_habitacion, 
           precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2)`,
        [
          servicioId,
          codigo,
          clienteIdFinal,
          habitacion_id,
          precio_habitacion || 0,
          precioServicioFinal,
          ivaFinal,
          sub_total,
          totalFinal,
          tiempo,
          metodo_pago || null,
          cajaId,
          createdBy
        ]
      );

      // NO actualizar estado de la habitación ya que está siendo usada por el servicio original
      // La habitación seguirá ocupada por el servicio original

      // Insertar detalles de clientes (si hay múltiples)
      if (clientesArray && Array.isArray(clientesArray) && clientesArray.length > 0) {
        for (const cId of clientesArray) {
          await connection(
            'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
            [servicioId, cId]
          );
        }
      } else if (clienteIdFinal) {
        // Si no hay array pero hay uno principal, insertarlo también en detalle para consistencia
        await connection(
          'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
          [servicioId, clienteIdFinal]
        );
      }

      for (const usuarioId of usuarios) {
        await connection('INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)', [
          usuarioId,
          servicioId
        ]);

        await connection('UPDATE usuarios SET estado_servicio = 2 WHERE id_usuario = ?', [usuarioId]);
      }
      // Registrar comisiones para cada anfitriona
      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        // Obtener la comisión de la habitación (comision_anfitriona)
        let comisionHabitacionBase = 0;
        if (habitacion_id) {
          const habitacionResult = (await connection(
            'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
            [habitacion_id]
          )) as any[];
          if (
            habitacionResult &&
            habitacionResult.length > 0 &&
            habitacionResult[0].comision_anfitriona
          ) {
            comisionHabitacionBase = Number(habitacionResult[0].comision_anfitriona);
          }
        }

        // El precio de servicio siempre se multiplica por el número de anfitrionas en la base de datos
        const nuevoPrecioServicio = (precioServicioFinal || 0) * usuarios.length;

        if (comisionHabitacionBase > 0) {
          // REGLA: Si la habitación tiene comisión
          const precioHabitacionOriginal = precio_habitacion || 0;
          const comisionServicioIndiv = Number(precioServicioFinal || 0);
          const comisionHabitacionIndiv = Math.floor(comisionHabitacionBase / usuarios.length);
          comisionTotalPorAnfitriona = comisionServicioIndiv + comisionHabitacionIndiv;

          const totalConComision = precioHabitacionOriginal + nuevoPrecioServicio + (ivaFinal || 0);
          await connection(
            'UPDATE servicios SET precio_servicio = ?, precio_habitacion = ?, total = ? WHERE id_servicio = ?',
            [nuevoPrecioServicio, precioHabitacionOriginal, totalConComision, servicioId]
          );
        } else {
          // REGLA: Si la habitación NO tiene comisión
          const nuevoPrecioHabitacion = (precio_habitacion || 0) * usuarios.length;
          comisionTotalPorAnfitriona = Number(precioServicioFinal || 0);

          await connection(
            'UPDATE servicios SET precio_servicio = ?, precio_habitacion = ?, total = ? WHERE id_servicio = ?',
            [
              nuevoPrecioServicio,
              nuevoPrecioHabitacion,
              nuevoPrecioHabitacion + nuevoPrecioServicio + (ivaFinal || 0),
              servicioId
            ]
          );
        }

        // Registrar las comisiones en BD siempre que el monto sea mayor a 0
        if (comisionTotalPorAnfitriona > 0) {
          for (const usuarioId of usuarios) {
            const comisionId = generateUUID();
            await connection(
              `INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto) VALUES (?, ?, ?, ?)`,
              [comisionId, null, servicioId, comisionTotalPorAnfitriona]
            );
            await connection(
              `INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision) VALUES (?, ?, ?, ?)`,
              [generateUUID(), comisionId, usuarioId, comisionTotalPorAnfitriona]
            );
          }
        }
      }

      const cajaActiva = (await connection(
        'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
      )) as any[];

      if (cajaActiva && cajaActiva.length > 0) {
        const cajaId = cajaActiva[0].id_caja;

        let montoEfectivo = 0;
        let montoTarjeta = 0;
        let montoTransferencia = 0;

        switch (metodo_pago) {
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
            totalFinal,
            montoEfectivo,
            montoTarjeta,
            montoTransferencia,
            ivaFinal,
            comisionTotalPorAnfitriona * usuarios.length,
            cajaId
          ]
        );

        cajaActualizada = true;
      }

      return {
        servicioId,
        comisionTotalPorAnfitriona
      };
    });

    // Obtener datos para la notificación del nuevo servicio
    const roomNameData = (await query('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [
      habitacion_id
    ])) as any[];
    const roomName = roomNameData[0]?.nombre || `Habitación ${habitacion_id}`;

    let clienteNombreResult = 'Cliente';
    if (clienteIdFinal) {
      const clienteData = (await query(
        'SELECT nombre, apellido FROM clientes WHERE id_cliente = ?',
        [clienteIdFinal]
      )) as any[];
      if (clienteData[0])
        clienteNombreResult = `${clienteData[0].nombre} ${clienteData[0].apellido}`;
    }

    let anfitrionasNicksResult = '';
    if (usuarios && usuarios.length > 0) {
      const usersData = (await query(
        `SELECT nick FROM usuarios WHERE id_usuario IN (${usuarios.map(() => '?').join(',')})`,
        usuarios
      )) as any[];
      anfitrionasNicksResult = usersData.map((u: any) => u.nick).join(', ');
    }

    const waiterNickResult = currentUser?.username || 'Cajero';
    const habitacionComisionResult = (await query(
      'SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?',
      [habitacion_id]
    )) as any[];

    // Notificar si se pausó el servicio original
    if (servicio_original_id) {
      sendNotificationToAll('timer_paused', {
        servicioId: servicio_original_id as string,
        tipoTransaccion: 'servicio'
      });
    }

    // Obtener la fecha de creación real desde la DB para sincronizar el timer
    const [serviceDetail]: any = await query(
      'SELECT fecha_crea FROM servicios WHERE id_servicio = ?',
      [result.servicioId]
    );
    const dbFechaCrea = serviceDetail?.fecha_crea || new Date();
    const startTimeIso = dbFechaCrea instanceof Date ? dbFechaCrea.toISOString() : dbFechaCrea;

    // Notificar inicio del servicio temporal vía SSE
    sendNotificationToAll('timer_started', {
      servicioId: result.servicioId,
      codigo: codigo,
      roomId: habitacion_id,
      roomName: roomName,
      duration: tiempo,
      startTime: startTimeIso,
      clienteNombre: clienteNombreResult,
      anfitrionas: anfitrionasNicksResult,
      anfitrionas_ids: usuarios,
      tipoTransaccion: 'servicio',
      precio_servicio: precio_servicio,
      precio_habitacion: precio_habitacion,
      iva: ivaFinal,
      total: totalFinal,
      metodo_pago: metodo_pago,
      waiter_name: waiterNickResult,
      habitacion_comision: habitacionComisionResult[0]?.comision_anfitriona || 0,
      created_at: startTimeIso
    });
    return res.status(201).json({
      success: true,
      message: 'Servicio creado exitosamente',
      data: {
        id_servicio: result.servicioId,
        codigo: codigo,
        servicio_original_id,
        comisiones_creadas: usuarios.length,
        comision_por_anfitriona: result.comisionTotalPorAnfitriona,
        caja_actualizada: cajaActualizada,
        es_temporal_vista: true // Solo temporal para la vista
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al crear servicio',
      error: error instanceof Error ? error.message : 'Error desconocido'
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
