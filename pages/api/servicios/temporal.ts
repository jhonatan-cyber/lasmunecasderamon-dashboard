/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { addServicioLog } from '@/lib/logUtils';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

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
      // IVA is 20% of the service price (not the room price)
      const precioNetoParaIva = subTotalNum - Number(precio_habitacion || 0);
      if (!ivaFinal && precioNetoParaIva > 0) {
        ivaFinal = Math.floor(precioNetoParaIva * 0.2);
      }
      
      const currentTotal = subTotalNum + ivaFinal;
      const totalRedondeado = Math.ceil(currentTotal / 5000) * 5000;
      const excedente = totalRedondeado - currentTotal;
      totalFinal = totalRedondeado;
      ivaFinal += excedente;
    }

    // Obtener la caja abierta actual
    const cajaAbiertaResult = (await query(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];
    const cajaId =
      cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

    const nowStr = getNowInBusinessTimezone();
    let cajaActualizadaLocal = false;

    // Crear servicio nuevo usando transacción
    const result = await withTransaction(async connection => {
      // Registrar en logs y pausar original si existe
      if (servicio_original_id) {
        const resS = await connection(
          'UPDATE servicios SET estado = 3, paused_at = ? WHERE id_servicio = ?',
          [nowStr, servicio_original_id]
        );
        if ((resS as any).affectedRows === 0) {
          await connection(
            'UPDATE ventas SET estado = 3, paused_at = ? WHERE id_venta = ?',
            [nowStr, servicio_original_id]
          );
        } else {
          await addServicioLog(servicio_original_id as string, 'PAUSA', 'Pausa por servicio temporal.', currentUser?.id);
        }
      }

      const servicioId = generateUUID();
      const numAnfitrionas = usuarios.length;
      const precioServicioIndividual = Number(precioServicioFinal || 0);
      const comisionTotalPerAnfitriona = precioServicioIndividual;
      const precioServicioTotalComponent = precioServicioIndividual * numAnfitrionas;
      const precioHabitacionTotalComponent = Number(precio_habitacion || 0);
      const subTotalFinalCalculated = precioServicioTotalComponent + precioHabitacionTotalComponent;

      // Insertar servicio
      await connection(
        `INSERT INTO servicios (
           id_servicio, codigo, cliente_id, habitacion_id, precio_habitacion, 
           precio_servicio, iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)`,
        [
          servicioId,
          codigo,
          clienteIdFinal,
          habitacion_id,
          precioHabitacionTotalComponent,
          precioServicioIndividual,
          ivaFinal,
          subTotalFinalCalculated,
          totalFinal,
          tiempo,
          metodo_pago || null,
          cajaId,
          createdBy,
          nowStr
        ]
      );

      // Clientes
      if (clientesArray && Array.isArray(clientesArray) && clientesArray.length > 0) {
        for (const cId of clientesArray) {
          await connection('INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES (?, ?, ?)', [generateUUID(), servicioId, cId]);
        }
      } else if (clienteIdFinal) {
        await connection('INSERT INTO detalle_servicios_clientes (id, servicio_id, cliente_id) VALUES (?, ?, ?)', [generateUUID(), servicioId, clienteIdFinal]);
      }

      // Anfitrionas y comisiones
      for (const usuarioId of usuarios) {
        await connection('INSERT INTO detalle_servicios (id_detalle_servicio, usuario_id, servicio_id, comision) VALUES (?, ?, ?, ?)', [
          generateUUID(),
          usuarioId,
          servicioId,
          comisionTotalPerAnfitriona
        ]);

        if (comisionTotalPerAnfitriona > 0) {
          const comisionId = generateUUID();
          await connection(`INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto, estado) VALUES (?, null, ?, ?, 1)`, [comisionId, servicioId, comisionTotalPerAnfitriona]);
          await connection(`INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado) VALUES (?, ?, ?, ?, 1)`, [generateUUID(), comisionId, usuarioId, comisionTotalPerAnfitriona]);
        }

        await connection('UPDATE usuarios SET estado_servicio = 2 WHERE id_usuario = ?', [usuarioId]);
      }

      // Caja
      if (cajaId) {
        let montoEfectivo = 0, montoTarjeta = 0, montoTransferencia = 0;
        switch (metodo_pago) {
          case 'tarjeta': montoTarjeta = totalFinal; break;
          case 'transferencia': montoTransferencia = totalFinal; break;
          default: montoEfectivo = totalFinal;
        }

        await connection(
          `UPDATE cajas SET servicio = servicio + ?, efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?, iva = iva + ?, comision = comision + ? WHERE id_caja = ?`,
          [totalFinal, montoEfectivo, montoTarjeta, montoTransferencia, ivaFinal, comisionTotalPerAnfitriona * numAnfitrionas, cajaId]
        );
        cajaActualizadaLocal = true;
      }

      return { servicioId, comisionTotalPerAnfitriona };
    });

    // Post-transacción: Notificaciones
    const roomNameData = (await query('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [habitacion_id])) as any[];
    const roomNameLabel = roomNameData[0]?.nombre || `Habitación ${habitacion_id}`;

    let clienteLabel = 'Cliente';
    if (clienteIdFinal) {
      const clienteData = (await query('SELECT nombre, apellido FROM clientes WHERE id_cliente = ?', [clienteIdFinal])) as any[];
      if (clienteData[0]) clienteLabel = `${clienteData[0].nombre} ${clienteData[0].apellido}`;
    }

    let anfitrionasNicks = '';
    const usersData = (await query(`SELECT nick FROM usuarios WHERE id_usuario IN (${usuarios.map(() => '?').join(',')})`, usuarios)) as any[];
    anfitrionasNicks = usersData.map((u: any) => u.nick).join(', ');

    const waiterNick = currentUser?.nick || currentUser?.username || 'Cajero';
    const habitacionComisionData = (await query('SELECT comision_anfitriona FROM habitaciones WHERE id_habitacion = ?', [habitacion_id])) as any[];
    const roomComision = habitacionComisionData[0]?.comision_anfitriona || 0;

    if (servicio_original_id) {
       sendNotificationToAll('timer_paused', { servicioId: servicio_original_id as string, tipoTransaccion: 'servicio' });
    }

    const startTimeIso = new Date(nowStr.replace(' ', 'T')).toISOString();

    sendNotificationToAll('timer_started', {
      servicioId: result.servicioId,
      codigo,
      roomId: habitacion_id,
      roomName: roomNameLabel,
      duration: tiempo,
      startTime: startTimeIso,
      clienteNombre: clienteLabel,
      anfitrionas: anfitrionasNicks,
      anfitrionas_ids: usuarios,
      tipoTransaccion: 'servicio',
      precio_servicio: precioServicioFinal,
      precio_habitacion: precio_habitacion,
      iva: ivaFinal,
      total: totalFinal,
      metodo_pago,
      waiter_name: waiterNick,
      habitacion_comision: roomComision,
      created_at: startTimeIso
    });

    return res.status(201).json({
      success: true,
      message: 'Servicio temporal creado exitosamente',
      data: {
        id_servicio: result.servicioId,
        codigo,
        comision_por_anfitriona: result.comisionTotalPerAnfitriona,
        caja_actualizada: cajaActualizadaLocal
      }
    });

  } catch (error: any) {
    console.error('Error en /api/servicios/temporal:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear servicio temporal',
      error: error?.message || 'Error desconocido'
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



