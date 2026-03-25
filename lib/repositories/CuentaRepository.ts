import { query, generateUUID, withTransaction } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import { sendNotificationToAll } from '@/lib/sseService';

export class CuentaRepository {
  static async getAll(tipo?: string, estado?: string) {
    if (tipo === 'resumen') {
      const result = await query<any[]>('SELECT SUM(total) as total_por_cobrar FROM cuentas WHERE estado = 1');
      return { total_por_cobrar: result[0]?.total_por_cobrar || 0 };
    }

    let where = 'WHERE c.estado >= 0';
    let params: any[] = [];
    if (estado !== undefined) {
      where = 'WHERE c.estado = ?';
      params.push(estado);
    }

    return await query(`
      SELECT c.*, CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre, cl.saldo as cliente_saldo,
             h.nombre as habitacion_numero, u.nick as nombre_cajero,
             (SELECT COUNT(*) FROM detalle_cuentas dc WHERE dc.cuenta_id = c.id_cuenta) as total_detalles,
             (SELECT COUNT(*) FROM cuentas_usuarios cu WHERE cu.cuenta_id = c.id_cuenta) as total_usuarios
      FROM cuentas c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id_cliente
      LEFT JOIN habitaciones h ON c.habitacion_id = h.id_habitacion
      LEFT JOIN usuarios u ON c.created_by = u.id_usuario
      ${where} ORDER BY c.fecha_crea DESC
    `, params);
  }

  static async getById(id: string) {
    return await withTransaction(async (trx) => {
      const cuentaRes = await trx<any[]>(`
        SELECT c.*, CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre, h.nombre as habitacion_numero,
               u.nick as nombre_cajero, u.foto as foto_cajero, uc.nick as nombre_cobrador, uc.foto as foto_cobrador
        FROM cuentas c
        LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
        LEFT JOIN usuarios u ON u.id_usuario = c.created_by
        LEFT JOIN usuarios uc ON uc.id_usuario = c.cobrado_por
        WHERE c.id_cuenta = ?
      `, [id]);

      if (cuentaRes.length === 0) return null;

      const detalles = await trx(`
        SELECT DC.*, H.nick as hostess_nick, H.foto as hostess_foto, U.nick as added_by, U.foto as added_by_foto, PR.nombre AS producto
        FROM detalle_cuentas DC 
        LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
        LEFT JOIN usuarios H ON H.id_usuario = DC.hostess_id
        LEFT JOIN usuarios U ON U.id_usuario = DC.created_by
        WHERE DC.cuenta_id = ?
      `, [id]);

      const usuarios = await trx(`
        SELECT cu.*, u.nick as usuario_nombre, u.foto as usuario_foto
        FROM cuentas_usuarios cu
        LEFT JOIN usuarios u ON u.id_usuario = cu.usuario_id
        WHERE cu.cuenta_id = ?
      `, [id]);

      return { ...cuentaRes[0], detalles, usuarios };
    });
  }

  static async create(body: any, createdBy: string) {
    return await withTransaction(async (trx) => {
      const id = generateUUID();
      const now = getNowInBusinessTimezone();
      await trx(`
        INSERT INTO cuentas (id_cuenta, codigo, cliente_id, total_comision, habitacion_id, sub_total, total, propina, fecha_crea, estado, tiempo, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      `, [id, body.codigo, body.cliente_id, body.total_comision, body.habitacion_id || null, body.sub_total, body.total, body.propina || 0, now, body.tiempo || 0, createdBy]);

      for (const d of body.detalles) {
        const selectedHostesses = (d.hostesses && d.hostesses.length > 0) ? d.hostesses : [null];
        const isSpecial = d.isChampagne || d.precio >= 160000;

        if (isSpecial) {
          const totalComm = Math.round(d.comision || 0);
          const commBase = Math.floor(totalComm / selectedHostesses.length);
          const remainder = totalComm % selectedHostesses.length;
          for (let i = 0; i < selectedHostesses.length; i++) {
            await trx(`INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [generateUUID(), id, d.producto_id, d.precio, i === 0 ? d.cantidad : 0, i === 0 ? d.sub_total : 0, commBase + (i === 0 ? remainder : 0), selectedHostesses[i], now, createdBy]);
          }
        } else {
          const baseQty = Math.floor(d.cantidad / selectedHostesses.length);
          let remainingQty = d.cantidad;
          for (let i = 0; i < selectedHostesses.length; i++) {
            const qty = (i === selectedHostesses.length - 1) ? remainingQty : (baseQty === 0 ? 1 : baseQty);
            remainingQty -= qty;
            if (qty > 0 || selectedHostesses.length === 1) {
              await trx(`INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [generateUUID(), id, d.producto_id, d.precio, qty, d.precio * qty, d.comision || 0, selectedHostesses[i], now, createdBy]);
            }
          }
        }
      }

      if (body.usuarios?.length) {
        for (const uId of body.usuarios) {
          await trx(`INSERT INTO cuentas_usuarios (id_cuenta_usuario, cuenta_id, usuario_id) VALUES (?, ?, ?)`, [generateUUID(), id, uId]);
        }
      }

      if (body.habitacion_id && body.tiempo > 0) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0 OR comision_anfitriona > 0)', [body.habitacion_id]);
        const habitacion = await trx<any[]>('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [body.habitacion_id]);
        const cliente = await trx<any[]>('SELECT nombre FROM clientes WHERE id_cliente = ?', [body.cliente_id]);
        sendNotificationToAll('timer_started', {
          servicioId: id, roomId: body.habitacion_id, roomName: habitacion[0]?.nombre || body.habitacion_id,
          duration: body.tiempo, startTime: now, codigo: body.codigo, clienteNombre: cliente[0]?.nombre || 'Cliente',
          tipoTransaccion: 'cuenta', status: 1
        });
      }
      return id;
    });
  }

  static async update(id: string, body: any, createdBy: string) {
    await withTransaction(async (trx) => {
      if (body.estado !== undefined) await trx('UPDATE cuentas SET estado = ? WHERE id_cuenta = ?', [body.estado, id]);
      if (body.detalles?.length) {
        let nuevoSubTotal = body.detalles.reduce((acc: number, d: any) => acc + d.sub_total, 0);
        let nuevaComision = body.detalles.reduce((acc: number, d: any) => acc + d.comision, 0);
        const actual = await trx<any[]>('SELECT sub_total, total_comision FROM cuentas WHERE id_cuenta = ?', [id]);
        const finalSub = (actual[0]?.sub_total || 0) + nuevoSubTotal;
        const finalComm = (actual[0]?.total_comision || 0) + nuevaComision;
        const now = getNowInBusinessTimezone();
        await trx('UPDATE cuentas SET sub_total = ?, total_comision = ?, total = ?, fecha_mod = ? WHERE id_cuenta = ?', [finalSub, finalComm, finalSub, now, id]);

        for (const d of body.detalles) {
          const selectedHostesses = (d.hostesses?.length) ? d.hostesses : [null];
          const isSpecial = d.isChampagne || d.precio >= 160000;
          if (isSpecial) {
             const tComm = Math.round(d.comision || 0);
             const base = Math.floor(tComm / selectedHostesses.length);
             const rem = tComm % selectedHostesses.length;
             for (let i = 0; i < selectedHostesses.length; i++) {
               await trx('INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                 [generateUUID(), id, d.producto_id, d.precio, i === 0 ? d.cantidad : 0, i === 0 ? d.sub_total : 0, base + (i === 0 ? rem : 0), selectedHostesses[i], now, createdBy]);
             }
          } else {
             const baseQty = Math.floor(d.cantidad / selectedHostesses.length);
             let remQty = d.cantidad;
             for (let i = 0; i < selectedHostesses.length; i++) {
               const qty = (i === selectedHostesses.length - 1) ? remQty : (baseQty === 0 ? 1 : baseQty);
               remQty -= qty;
               if (qty > 0 || selectedHostesses.length === 1) {
                 await trx('INSERT INTO detalle_cuentas (id_detalle_cuenta, cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                   [generateUUID(), id, d.producto_id, d.precio, qty, d.precio * qty, d.comision || 0, selectedHostesses[i], now, createdBy]);
               }
             }
          }
        }
      }
      if (body.usuarios?.length) {
        await trx('DELETE FROM cuentas_usuarios WHERE cuenta_id = ?', [id]);
        for (const uId of body.usuarios) await trx('INSERT INTO cuentas_usuarios (cuenta_id, usuario_id) VALUES (?, ?)', [id, uId]);
      }
    });

    if (body.extraTiempo > 0) {
      const c = await query<any[]>('SELECT * FROM cuentas WHERE id_cuenta = ?', [id]);
      if (c.length) {
        const elapsed = Math.floor((Date.now() - new Date(c[0].fecha_crea).getTime()) / 1000);
        const remaining = Math.max(0, (c[0].tiempo * 60) - elapsed);
        const nuevoTiempo = Math.ceil(remaining / 60) + Number(body.extraTiempo);
        const now = getNowInBusinessTimezone();
        await query('UPDATE cuentas SET tiempo = ?, fecha_crea = ? WHERE id_cuenta = ?', [nuevoTiempo, now, id]);
        if (c[0].habitacion_id) await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0)', [c[0].habitacion_id]);
        
        const client = await query<any[]>('SELECT cl.nombre FROM cuentas c LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id WHERE c.id_cuenta = ?', [id]);
        const room = await query<any[]>('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [c[0].habitacion_id]);
        sendNotificationToAll(remaining > 0 ? 'timer_updated' : 'timer_started', {
          servicioId: id, roomId: c[0].habitacion_id, roomName: room[0]?.nombre || '', duration: nuevoTiempo,
          startTime: now, codigo: c[0].codigo, clienteNombre: client[0]?.nombre || 'Cliente', tipoTransaccion: 'cuenta', status: 1
        });
      }
    }
  }

  static async cobrar(id: string, body: any, cobradoPor: string) {
    return await withTransaction(async (trx) => {
      const cuenta = await trx<any[]>('SELECT * FROM cuentas WHERE id_cuenta = ?', [id]);
      if (!cuenta.length) throw new Error('Cuenta no encontrada');
      if (cuenta[0].estado !== 1) throw new Error('La cuenta ya fue procesada');

      const now = getNowInBusinessTimezone();
      await trx('UPDATE cuentas SET estado = 2, metodo_pago = ?, cobrado_por = ?, fecha_mod = ? WHERE id_cuenta = ?', [body.metodoPago, cobradoPor, now, id]);

      if (body.metodoPago === 'prepago') {
        const client = await trx<any[]>('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [cuenta[0].cliente_id]);
        if (!client.length || client[0].saldo < body.montoFinal) throw new Error('Saldo insuficiente');
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [body.montoFinal, cuenta[0].cliente_id]);
      }

      const caja = await trx<any[]>('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1');
      if (caja.length) {
        await trx(`UPDATE cajas SET cuenta = cuenta + ?, propina = propina + ?, efectivo = efectivo + ?, tarjeta = tarjeta + ?, transferencia = transferencia + ?, prepago = prepago + ? WHERE id_caja = ?`,
          [body.montoFinal - body.propinaFinal, body.propinaFinal, body.tipoPago === 'efectivo' ? body.montoFinal : 0, body.tipoPago === 'tarjeta' ? body.montoFinal : 0, body.tipoPago === 'transferencia' ? body.montoFinal : 0, body.tipoPago === 'prepago' ? body.montoFinal : 0, caja[0].id_caja]);
      }

      const detalles = await trx<any[]>('SELECT * FROM detalle_cuentas WHERE cuenta_id = ?', [id]);
      for (const d of detalles) {
        if (d.hostess_id && d.comision > 0) {
          const commId = generateUUID();
          await trx('INSERT INTO comisiones (id_comision, cuenta_id, monto, estado) VALUES (?, ?, ?, 1)', [commId, id, d.comision]);
          await trx('INSERT INTO detalle_comisiones (id_detalle_comision, comision_id, usuario_id, comision, estado) VALUES (?, ?, ?, ?, 1)', [generateUUID(), commId, d.hostess_id, d.comision]);
        }
      }

      if (cuenta[0].habitacion_id) {
        await trx('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [cuenta[0].habitacion_id]);
        sendNotificationToAll('room_available', { roomId: cuenta[0].habitacion_id });
      }

      sendNotificationToAll('timer_stopped', { servicioId: id, status: 0 });
    });
  }

  static async delete(id: string) {
    await withTransaction(async (trx) => {
      await trx('DELETE FROM detalle_cuentas WHERE cuenta_id = ?', [id]);
      await trx('DELETE FROM cuentas_usuarios WHERE cuenta_id = ?', [id]);
      await trx('DELETE FROM cuentas WHERE id_cuenta = ?', [id]);
    });
  }
}
