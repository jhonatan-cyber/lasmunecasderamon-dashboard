import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

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
    const { cuenta_id, metodo_pago, propina = 0, total_cobrado, habitacion_id = null } = req.body;

    // Validaciones
    if (!cuenta_id || !metodo_pago || total_cobrado === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Faltan campos requeridos: cuenta_id, metodo_pago, total_cobrado'
      });
    }

    // Validar método de pago
    const metodosValidos = ['efectivo', 'tarjeta', 'transferencia'];
    if (!metodosValidos.includes(metodo_pago)) {
      return res.status(400).json({
        success: false,
        message: 'Método de pago inválido'
      });
    }

    // Actualizar el estado de la cuenta a "Cobrada" (estado = 0)
    const updateCuentaSql = `
      UPDATE cuentas 
      SET estado = 0, 
          fecha_mod = NOW()
      WHERE id_cuenta = ?
    `;

    await query(updateCuentaSql, [cuenta_id]);

    // Registrar el cobro en la tabla cobros_cuentas (si existe)
    try {
      const insertCobroSql = `
        INSERT INTO cobros_cuentas (
          cuenta_id,
          metodo_pago,
          propina,
          total_cobrado,
          habitacion_id,
          fecha_cobro
        ) VALUES (?, ?, ?, ?, ?, NOW())
      `;

      await query(insertCobroSql, [cuenta_id, metodo_pago, propina, total_cobrado, habitacion_id]);

      // --- DISTRIBUCIÓN DE PROPINAS ---
      if (propina && Number(propina) > 0) {
        let staffIds = (await query(`
          SELECT DISTINCT u.id_usuario
          FROM logins l
          INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
          INNER JOIN roles r ON r.id_rol = u.rol_id
          WHERE l.estado = 1 AND u.estado = 1 AND r.nombre IN ('cajero', 'garzon')
        `)) as any[];

        // Fallback al usuario actual si no hay nadie más logueado
        if ((!staffIds || staffIds.length === 0) && currentUser) {
          staffIds = [{ id_usuario: currentUser.id }];
        }

        if (staffIds && staffIds.length > 0) {
          const totalPropina = Math.round(Number(propina));
          const cuotaBase = Math.floor(totalPropina / staffIds.length);
          const residuo = totalPropina % staffIds.length;

          const resultPropina: any = await query(
            'INSERT INTO propinas (venta_id, propina) VALUES (?, ?)',
            [0, totalPropina]
          );
          const propinaId = resultPropina.insertId;

          for (let i = 0; i < staffIds.length; i++) {
            const montoFinal = cuotaBase + (i < residuo ? 1 : 0);
            if (montoFinal > 0) {
              await query(
                'INSERT INTO detalle_propinas (propina_id, usuario_id, monto) VALUES (?, ?, ?)',
                [propinaId, staffIds[i].id_usuario, montoFinal]
              );
            }
          }
        }
      }

      // --- REGISTRO DE COMISIONES ---
      const detallesParaComisiones = (await query(`
        SELECT DC.comision, DC.hostess_id 
        FROM detalle_cuentas DC
        WHERE DC.cuenta_id = ? AND DC.comision > 0
      `, [cuenta_id])) as any[];

      if (detallesParaComisiones.length > 0) {
        const comisionesPorAnfitriona = new Map<number, number>();
        const usuariosGralesCuenta = (await query(`
          SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ?
        `, [cuenta_id])) as any[];

        for (const detalle of detallesParaComisiones) {
          const montoComm = Math.round(Number(detalle.comision) || 0);
          if (detalle.hostess_id) {
            const hId = Number(detalle.hostess_id);
            comisionesPorAnfitriona.set(hId, (comisionesPorAnfitriona.get(hId) || 0) + montoComm);
          } else if (usuariosGralesCuenta.length > 0) {
            const cuotaBase = Math.floor(montoComm / usuariosGralesCuenta.length);
            const residuo = montoComm % usuariosGralesCuenta.length;
            for (let i = 0; i < usuariosGralesCuenta.length; i++) {
              const uId = Number(usuariosGralesCuenta[i].usuario_id);
              const montoFinal = cuotaBase + (i < residuo ? 1 : 0);
              comisionesPorAnfitriona.set(uId, (comisionesPorAnfitriona.get(uId) || 0) + montoFinal);
            }
          }
        }

        for (const [uId, monto] of comisionesPorAnfitriona.entries()) {
          if (monto > 0) {
            const comisionResult: any = await query(
              `INSERT INTO comisiones (venta_id, servicio_id, monto) VALUES (?, ?, ?)`,
              [0, 0, monto]
            );
            const comisionId = comisionResult.insertId;
            await query(
              `INSERT INTO detalle_comisiones (comision_id, usuario_id, comision) VALUES (?, ?, ?)`,
              [comisionId, uId, monto]
            );
          }
        }
      }

      // --- ACTUALIZACIÓN DE CAJA ---
      try {
        const cajaActiva = (await query(
          'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
        )) as any[];

        if (cajaActiva && cajaActiva.length > 0) {
          const cajaId = cajaActiva[0].id_caja;
          let montoEfectivo = 0;
          let montoTarjeta = 0;
          let montoTransferencia = 0;

          const totalVenta = Number(total_cobrado || 0);

          switch (metodo_pago) {
            case 'efectivo': montoEfectivo = totalVenta; break;
            case 'tarjeta': montoTarjeta = totalVenta; break;
            case 'transferencia': montoTransferencia = totalVenta; break;
            default: montoEfectivo = totalVenta;
          }

          // Calcular comision total de la cuenta para actualizar la caja
          const totalCommCuenta = detallesParaComisiones.reduce((acc, d) => acc + (Number(d.comision) || 0), 0);

          await query(
            `UPDATE cajas SET 
              venta = venta + ?,
              propina = propina + ?,
              efectivo = efectivo + ?,
              tarjeta = tarjeta + ?,
              transferencia = transferencia + ?,
              comision = comision + ?
            WHERE id_caja = ?`,
            [
              totalVenta - Number(propina || 0),
              Number(propina || 0),
              montoEfectivo,
              montoTarjeta,
              montoTransferencia,
              totalCommCuenta,
              cajaId
            ]
          );
        }
      } catch (cajaError) {
        console.error('Error al actualizar caja:', cajaError);
      }

    } catch (error) {
      console.error('Error al registrar cobro o distribuir propinas/comisiones:', error);
    }

    // Actualizar estado de la habitación si no es área libre
    if (habitacion_id) {
      try {
        const checkFreeRoom = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [habitacion_id])) as any[];
        let isFreeRoom = false;
        if (checkFreeRoom.length > 0) {
          const room = checkFreeRoom[0];
          isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
        }

        if (!isFreeRoom) {
          await query('UPDATE habitaciones SET estado = 1 WHERE id_habitacion = ?', [habitacion_id]);
        }
      } catch (error) {
        console.error('Error al actualizar habitación:', error);
      }
    }

    // --- LIBERAR ANFITRIONAS ---
    try {
      const usersToRelease = (await query(
        'SELECT usuario_id FROM cuentas_usuarios WHERE cuenta_id = ?',
        [cuenta_id]
      )) as any[];

      for (const u of usersToRelease) {
        const userId = Number(u.usuario_id);
        // Actualizar estado en DB
        await query('UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario = ?', [userId]);

        // Notificar por SSE
        await sendNotificationToAll('user_status_updated', {
          userId: userId,
          status: 1 // Disponible
        });
      }
    } catch (userReleaseError) {
      console.error('Error al liberar anfitrionas:', userReleaseError);
    }

    return res.status(200).json({
      success: true,
      message: 'Cuenta cobrada exitosamente',
      data: {
        cuenta_id,
        metodo_pago,
        propina,
        total_cobrado,
        habitacion_id,
        fecha_cobro: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error final en handler de cobro:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor al cobrar la cuenta'
    });
  }
}

export default withAuth(handler);
