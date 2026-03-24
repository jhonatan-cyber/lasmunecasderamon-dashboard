/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';
import { withTransaction } from '@/lib/transactionUtils';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Método no permitido'
    });
  }

  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de cuenta es requerido'
    });
  }

  try {
    const currentUser = getCurrentUser(req);
    const createdBy = currentUser?.id || "default-user";
    const { cuenta_id, metodo_pago, propina = 0, total_cobrado, habitacion_id = null } = req.body;

    // Validaciones
    if (!cuenta_id || !metodo_pago || total_cobrado === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: cuenta_id, metodo_pago, total_cobrado'
      });
    }

    // Validar método de pago (incluyendo prepago)
    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia', 'prepago'];
    if (!metodosValidos.includes(metodo_pago)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago inválido'
      });
    }

    const now = getNowInBusinessTimezone();

    const result = await withTransaction(async (trx) => {
      // 0. Si el método de pago es prepago, verificar y descontar saldo
      if (metodo_pago === 'prepago') {
        const cuentaData = (await trx('SELECT cliente_id, total FROM cuentas WHERE id_cuenta = ?', [cuenta_id])) as any[];
        if (cuentaData.length === 0) {
          throw new Error('Cuenta no encontrada');
        }
        
        const clienteId = cuentaData[0].cliente_id;
        if (!clienteId) {
          throw new Error('Se requiere seleccionar un cliente registrado para pagar con saldo prepago');
        }

        const clienteData = (await trx('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [clienteId])) as any[];
        if (clienteData.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        const saldoActual = clienteData[0].saldo || 0;
        if (saldoActual < total_cobrado) {
          throw new Error(`Saldo insuficiente. Saldo disponible: ${saldoActual.toLocaleString('es-CL')}, Total cobro: ${total_cobrado.toLocaleString('es-CL')}`);
        }

        // Descontar saldo
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [total_cobrado, clienteId]);

        // Registrar movimiento de consumo prepago (sin venta_id ya que es una cuenta consolidada)
        await trx(
          `INSERT INTO clientes_prepago_movimientos 
          (id_movimiento, cliente_id, tipo, monto, venta_id, usuario_id, fecha_crea) 
          VALUES (?, ?, 'CONSUMO', ?, NULL, ?, ?)`,
          [generateUUID(), clienteId, total_cobrado, createdBy, now]
        );
      }

      // 1. Actualizar el estado de la cuenta a "Cobrada" (estado = 0) y registrar quién cobró y la propina gastada
      await trx(`UPDATE cuentas SET estado = 0, fecha_mod = ?, cobrado_por = ?, propina = ? WHERE id_cuenta = ?`, [now, createdBy, propina || 0, cuenta_id]);

      // 1.5 Crear el registro de Venta para el historial unificado
      const ventaId = generateUUID();
      const codigoVentaRes = await trx(`SELECT codigo, cliente_id FROM cuentas WHERE id_cuenta = ?`, [cuenta_id]);
      const codigoVenta = codigoVentaRes[0]?.codigo || `V-${Date.now()}`;
      const clienteId = codigoVentaRes[0]?.cliente_id || null;
      
      const insertVentaSql = `
        INSERT INTO ventas (
          id_venta, codigo, cliente_id, habitacion_id, metodo_pago, propina, 
          sub_total, total, caja_id, created_by, estado, fecha_crea, cuenta_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `;
      
      const cajaActivaResult = (await trx('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1')) as any[];
      const cajaId = (cajaActivaResult && cajaActivaResult.length > 0) ? cajaActivaResult[0].id_caja : null;

      await trx(insertVentaSql, [
        ventaId, codigoVenta, clienteId, habitacion_id, metodo_pago, propina,
        total_cobrado - propina, total_cobrado, cajaId, createdBy, now, cuenta_id
      ]);

      // 1.6 Migrar detalles de cuenta a detalles de venta
      const detallesCuenta = (await trx(`SELECT * FROM detalle_cuentas WHERE cuenta_id = ?`, [cuenta_id])) as any[];
      for (const dc of detallesCuenta) {
        await trx(
          `INSERT INTO detalle_ventas (id_detalle_venta, venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [generateUUID(), ventaId, dc.producto_id, dc.precio, (Number(dc.comision) || 0) / (dc.cantidad || 1), dc.cantidad, dc.sub_total, dc.hostess_id]
        );
      }

      // 1.7 Migrar usuarios de cuenta a usuarios de venta
      const usuariosCuenta = (await trx(`SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ?`, [cuenta_id])) as any[];
      for (const uc of usuariosCuenta) {
        await trx(
          `INSERT INTO ventas_usuarios (id_usuario_venta, venta_id, usuario_id) VALUES (?, ?, ?)`,
          [generateUUID(), ventaId, uc.usuario_id]
        );
      }

      // 2. Registrar el cobro en la tabla cobros_cuentas (Opcional - mantenemos por compatibilidad si existe)
      try {
        const insertCobroSql = `
          INSERT INTO cobros_cuentas (
            cuenta_id, metodo_pago, propina, total_cobrado, habitacion_id, fecha_cobro
          ) VALUES (?, ?, ?, ?, ?, ?)
        `;
        await trx(insertCobroSql, [cuenta_id, metodo_pago, propina, total_cobrado, habitacion_id, now]);
      } catch (e) {
        // Si no existe la tabla cobros_cuentas, ignorar
      }

      // 3. Distribución de propinas
      if (propina && Number(propina) > 0) {
        let staffIds = (await trx(`
          SELECT DISTINCT u.id_usuario
          FROM logins l
          INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
          INNER JOIN roles r ON r.id_rol = u.rol_id
          WHERE l.estado = 1 AND u.estado = 1 AND r.nombre IN ('cajero', 'garzon')
        `)) as any[];

        if ((!staffIds || staffIds.length === 0) && currentUser) {
          staffIds = [{ id_usuario: currentUser.id }];
        }

        if (staffIds && staffIds.length > 0) {
          const totalPropina = Math.round(Number(propina));
          const cuotaBase = Math.floor(totalPropina / staffIds.length);
          const residuo = totalPropina % staffIds.length;

          const propinaId = generateUUID();
          await trx('INSERT INTO propinas (id_propina, venta_id, propina, fecha_crea) VALUES (?, ?, ?, ?)', [propinaId, ventaId, totalPropina, now]);

          for (let i = 0; i < staffIds.length; i++) {
            const montoFinal = cuotaBase + (i < residuo ? 1 : 0);
            if (montoFinal > 0) {
              await trx('INSERT INTO detalle_propinas (id_detalle_propina, propina_id, usuario_id, monto, fecha_crea) VALUES (?, ?, ?, ?, ?)', [generateUUID(), propinaId, staffIds[i].id_usuario, montoFinal, now]);
            }
          }
        }
      }

      // 4. Registro de comisiones
      const detallesParaComisiones = (await trx(`
        SELECT DC.comision, DC.hostess_id 
        FROM detalle_cuentas DC
        WHERE DC.cuenta_id = ? AND DC.comision > 0
      `, [cuenta_id])) as any[];

      if (detallesParaComisiones.length > 0) {
        const comisionesPorAnfitriona = new Map<string, number>();
        const usuariosGralesCuenta = (await trx(`SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ?`, [cuenta_id])) as any[];

        for (const detalle of detallesParaComisiones) {
          const montoComm = Math.round(Number(detalle.comision) || 0);
          if (detalle.hostess_id) {
            const hId = detalle.hostess_id as string;
            comisionesPorAnfitriona.set(hId, (comisionesPorAnfitriona.get(hId) || 0) + montoComm);
          } else if (usuariosGralesCuenta.length > 0) {
            const cuotaBase = Math.floor(montoComm / usuariosGralesCuenta.length);
            const residuo = montoComm % usuariosGralesCuenta.length;
            for (let i = 0; i < usuariosGralesCuenta.length; i++) {
              const uId = usuariosGralesCuenta[i].usuario_id as string;
              const montoFinal = cuotaBase + (i < residuo ? 1 : 0);
              comisionesPorAnfitriona.set(uId, (comisionesPorAnfitriona.get(uId) || 0) + montoFinal);
            }
          }
        }

        for (const [uId, monto] of comisionesPorAnfitriona.entries()) {
          if (monto > 0) {
            const comisionId = generateUUID();
            await trx(`INSERT INTO comisiones (id_comision, venta_id, servicio_id, monto, fecha_crea) VALUES (?, ?, ?, ?, ?)`, [comisionId, ventaId, null, monto, now]);
            await trx(`INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, fecha_crea) VALUES (?, ?, ?, ?, ?)`, [generateUUID(), comisionId, uId, monto, now]);
          }
        }
      }

      // 5. Actualización de caja activa
      if (cajaId) {
        let montoEfectivo = 0, montoTarjeta = 0, montoTransferencia = 0, montoPrepago = 0;
        const totalVenta = Number(total_cobrado || 0);

        switch (metodo_pago) {
          case 'efectivo': montoEfectivo = totalVenta; break;
          case 'tarjeta': montoTarjeta = totalVenta; break;
          case 'transferencia': montoTransferencia = totalVenta; break;
          case 'prepago': montoPrepago = totalVenta; break;
          default: montoEfectivo = totalVenta;
        }

        const totalCommCuenta = detallesParaComisiones.reduce((acc, d) => acc + (Number(d.comision) || 0), 0);
        await trx(
          `UPDATE cajas SET 
            venta = venta + ?, 
            propina = propina + ?, 
            efectivo = efectivo + ?, 
            tarjeta = tarjeta + ?, 
            transferencia = transferencia + ?, 
            prepago = prepago + ?, 
            comision = comision + ?
          WHERE id_caja = ?`,
          [
            totalVenta - Number(propina || 0), 
            Number(propina || 0), 
            montoEfectivo, 
            montoTarjeta, 
            montoTransferencia, 
            montoPrepago, 
            totalCommCuenta, 
            cajaId
          ]
        );
      }

      // 6. Liberar habitación si aplica
      if (habitacion_id) {
        const roomInfo = (await trx('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacion_id])) as any[];
        if (roomInfo.length > 0) {
          const room = roomInfo[0];
          const isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
          if (!isFreeRoom) {
            await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacion_id]);
          }
        }
      }

      // 7. Liberar anfitrionas asignadas a la cuenta
      const usersToRelease = (await trx('SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ?', [cuenta_id])) as any[];
      for (const u of usersToRelease) {
        await trx('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [u.usuario_id]);
        await sendNotificationToAll('user_status_updated', { userId: u.usuario_id, status: 1 });
      }

      return { cuenta_id, metodo_pago, propina, total_cobrado, habitacion_id, fecha_cobro: now };
    });

    return res.status(200).json({
      success: true,
      message: 'Cuenta cobrada exitosamente',
      data: result
    });

  } catch (error) {
    console.error('Error final en handler de cobro:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Error interno al cobrar la cuenta'
    });
  }
}

export default withAuth(handler);
