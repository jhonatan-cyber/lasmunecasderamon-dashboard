import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '@/pages/api/notifications/sse';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de cuenta es requerido'
    });
  }

  const cuentaId = parseInt(id);

  if (req.method === 'GET') {
    try {
      // Verificar si la tabla existe
      const tableCheck = (await query(`
        SHOW TABLES LIKE 'cuentas'
      `)) as any[];

      // Si no existen las tablas, devolver error
      if (!tableCheck || tableCheck.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Tabla de cuentas no encontrada'
        });
      }

      // Obtener la cuenta y sus detalles usando una transacción para consistencia de conexión
      const result = await withTransaction(async (trx) => {
        // 1. Obtener la cuenta principal
        const cuentaResult = (await trx(
          `
          SELECT 
            c.id_cuenta,
            c.codigo,
            c.cliente_id,
            c.total_comision,
            c.habitacion_id,
            c.sub_total,
            c.total,
            c.pedido_id,
            c.servicio_id,
            c.fecha_crea,
            c.estado,
            CONCAT(cl.nombre, ' ', cl.apellido) as cliente_nombre,
            h.nombre as habitacion_numero
          FROM cuentas c
          LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id
          LEFT JOIN habitaciones h ON h.id_habitacion = c.habitacion_id
          WHERE c.id_cuenta = ?
        `,
          [cuentaId]
        )) as any[];

        if (!cuentaResult || cuentaResult.length === 0) {
          return null;
        }

        const cuenta = cuentaResult[0];

        // 2. Obtener detalles de la cuenta con productos e información de anfitriona
        const detallesResult = await trx(
          `
          SELECT 
            DC.id_detalle_cuenta,
            DC.precio, 
            DC.cantidad, 
            DC.sub_total, 
            DC.comision, 
            DC.fecha_crea,
            DC.hostess_id,
            H.nick as hostess_nick,
            PR.nombre AS producto, 
            PR.id_producto
          FROM detalle_cuentas DC 
          LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
          LEFT JOIN usuarios H ON H.id_usuario = DC.hostess_id
          WHERE DC.cuenta_id = ?
        `,
          [cuentaId]
        );

        // 3. Obtener usuarios asociados (anfitrionas generales de la cuenta)
        const usuariosResult = await trx(
          `
          SELECT 
            cu.id_cuenta_usuario,
            cu.cuenta_id,
            cu.usuario_id,
            u.nick as usuario_nombre
          FROM cuentas_usuarios cu
          LEFT JOIN usuarios u ON u.id_usuario = cu.usuario_id
          WHERE cu.cuenta_id = ?
        `,
          [cuentaId]
        );

        return {
          ...cuenta,
          detalles: Array.isArray(detallesResult) ? detallesResult : [],
          usuarios: Array.isArray(usuariosResult) ? usuariosResult : []
        };
      });

      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Cuenta no encontrada'
        });
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error('Error in GET /api/cuentas/[id]:', error);
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la cuenta',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { estado, detalles, usuarios, extraTiempo } = req.body;
      // Verificar si la cuenta existe
      const cuentaExistente = (await query(
        `
        SELECT id_cuenta, estado FROM cuentas WHERE id_cuenta = ?
      `,
        [cuentaId]
      )) as any[];

      if (!cuentaExistente || cuentaExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cuenta no encontrada'
        });
      }

      // Actualizar usando transacción
      await withTransaction(async trx => {
        // 1. Actualizar estado si se proporciona
        if (estado !== undefined) {
          await trx(
            `
            UPDATE cuentas SET estado = ? WHERE id_cuenta = ?
          `,
            [estado, cuentaId]
          );
        }

        // 2. Actualizar detalles si se proporcionan
        if (detalles && Array.isArray(detalles)) {
          // Calcular totales de los nuevos productos
          let nuevoSubTotal = 0;
          let nuevaComisionTotal = 0;

          for (const detalle of detalles) {
            nuevoSubTotal += detalle.sub_total;
            nuevaComisionTotal += detalle.comision;
          }

          // Obtener valores actuales de la cuenta
          const cuentaActual = (await trx(
            `
            SELECT sub_total, total_comision, total FROM cuentas WHERE id_cuenta = ?
          `,
            [cuentaId]
          )) as any[];

          // Calcular nuevos totales
          const nuevoSubTotalFinal = (cuentaActual?.[0]?.sub_total || 0) + nuevoSubTotal;
          const nuevaComisionFinal = (cuentaActual?.[0]?.total_comision || 0) + nuevaComisionTotal;
          const nuevoTotalFinal = nuevoSubTotalFinal; // El total es igual al subtotal

          // Actualizar la cuenta con los nuevos totales
          await trx(
            `
            UPDATE cuentas 
            SET sub_total = ?, total_comision = ?, total = ?, fecha_mod = NOW()
            WHERE id_cuenta = ?
          `,
            [nuevoSubTotalFinal, nuevaComisionFinal, nuevoTotalFinal, cuentaId]
          );

          // Insertar nuevos detalles
          for (const detalle of detalles) {
            const selectedHostesses = (detalle.hostesses && Array.isArray(detalle.hostesses) && detalle.hostesses.length > 0)
              ? detalle.hostesses
              : [null];

            const precioTotal = detalle.precio || 0;
            const totalQty = detalle.cantidad || 1;
            const isChampagne = (detalle.isChampagne === true);
            const isHighPrice = precioTotal >= 160000;

            if (isChampagne || isHighPrice) {
              // COMPARTIDO - SE DIVIDE LA COMISIÓN
              const totalComm = Math.round(detalle.comision || 0);
              const commBase = Math.floor(totalComm / selectedHostesses.length);
              const remainder = totalComm % selectedHostesses.length;

              for (let i = 0; i < selectedHostesses.length; i++) {
                const hId = selectedHostesses[i];
                const finalComm = commBase + (i === 0 ? remainder : 0);

                await trx(
                  `INSERT INTO detalle_cuentas (
                    cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                  [
                    cuentaId,
                    detalle.producto_id,
                    detalle.precio,
                    i === 0 ? totalQty : 0,
                    i === 0 ? (detalle.sub_total || totalQty * detalle.precio) : 0,
                    finalComm,
                    hId
                  ]
                );
              }
            } else {
              // REPARTIDO POR CANTIDAD
              const baseQty = Math.floor(totalQty / selectedHostesses.length);
              let remainingQty = totalQty;

              for (let i = 0; i < selectedHostesses.length; i++) {
                const hId = selectedHostesses[i];
                const isLast = i === selectedHostesses.length - 1;
                const itemQty = isLast ? remainingQty : (baseQty === 0 ? 1 : baseQty);
                remainingQty -= itemQty;

                if (itemQty > 0 || selectedHostesses.length === 1) {
                  await trx(
                    `INSERT INTO detalle_cuentas (
                      cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
                    [
                      cuentaId,
                      detalle.producto_id,
                      detalle.precio,
                      itemQty,
                      detalle.precio * itemQty,
                      detalle.comision || 0,
                      hId
                    ]
                  );
                }
              }
            }
          }
        }

        // 3. Actualizar usuarios si se proporcionan
        if (usuarios && Array.isArray(usuarios)) {
          // Eliminar usuarios existentes
          await trx(
            `
            DELETE FROM cuentas_usuarios WHERE cuenta_id = ?
          `,
            [cuentaId]
          );

          // Insertar nuevos usuarios
          for (const usuarioId of usuarios) {
            await trx(
              `
              INSERT INTO cuentas_usuarios (cuenta_id, usuario_id)
              VALUES (?, ?)
            `,
              [cuentaId, usuarioId]
            );
          }
        }
      });

      // 4. Manejar tiempo extra (suma o inicio de temporizador)
      if (extraTiempo && Number(extraTiempo) > 0) {
        const cuentaConTiempo = (await query(
          'SELECT id_cuenta, habitacion_id, tiempo, fecha_crea, codigo FROM cuentas WHERE id_cuenta = ?',
          [cuentaId]
        )) as any[];

        if (cuentaConTiempo && cuentaConTiempo.length > 0) {
          const c = cuentaConTiempo[0];
          const tiempoActual = Number(c.tiempo || 0);
          const habitacionId = c.habitacion_id;

          // Calcular tiempo restante en segundos
          const elapsed = Math.floor((Date.now() - new Date(c.fecha_crea).getTime()) / 1000);
          const totalSecs = tiempoActual * 60;
          const remainingSecs = Math.max(0, totalSecs - elapsed);
          const remainingMins = Math.ceil(remainingSecs / 60);

          // Siempre reiniciamos fecha_crea a AHORA y ajustamos duration:
          //   - Si había tiempo restante: duration = remainingMins + extraTiempo
          //   - Si no había tiempo (expirado o sin timer): duration = extraTiempo
          const nuevoTiempoTotal = remainingMins + Number(extraTiempo);
          const nuevaFechaCrea = new Date().toISOString().slice(0, 19).replace('T', ' ');

          // Actualizar tiempo y fecha_crea de la cuenta
          await query(
            'UPDATE cuentas SET tiempo = ?, fecha_crea = ? WHERE id_cuenta = ?',
            [nuevoTiempoTotal, nuevaFechaCrea, cuentaId]
          );

          // Marcar habitación como ocupada si tiene una
          if (habitacionId) {
            await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0 OR COALESCE(comision_anfitriona, 0) > 0)', [habitacionId]);
          }

          // Obtener datos para SSE
          const clienteRow = (await query(
            'SELECT cl.nombre FROM cuentas c LEFT JOIN clientes cl ON cl.id_cliente = c.cliente_id WHERE c.id_cuenta = ?',
            [cuentaId]
          )) as any[];
          const habitacionRow = habitacionId
            ? (await query('SELECT nombre FROM habitaciones WHERE id_habitacion = ?', [habitacionId])) as any[]
            : [];

          const eventType = remainingMins > 0 ? 'timer_updated' : 'timer_started';

          await sendNotificationToAll(eventType, {
            type: eventType,
            data: {
              servicioId: cuentaId,
              roomId: habitacionId,
              roomName: habitacionRow[0]?.nombre || '',
              duration: nuevoTiempoTotal,
              startTime: nuevaFechaCrea,
              codigo: c.codigo,
              clienteNombre: clienteRow[0]?.nombre || 'Cliente',
              tipoTransaccion: 'cuenta',
            }
          });
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Cuenta actualizada exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar la cuenta',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Verificar si la cuenta existe
      const cuentaExistente = (await query(
        `
        SELECT id_cuenta, estado FROM cuentas WHERE id_cuenta = ?
      `,
        [cuentaId]
      )) as any[];

      if (!cuentaExistente || cuentaExistente.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Cuenta no encontrada'
        });
      }

      // Eliminar usando transacción
      await withTransaction(async trx => {
        // 1. Eliminar detalles de la cuenta
        await trx(
          `
          DELETE FROM detalle_cuentas WHERE cuenta_id = ?
        `,
          [cuentaId]
        );

        // 2. Eliminar usuarios asociados
        await trx(
          `
          DELETE FROM cuentas_usuarios WHERE cuenta_id = ?
        `,
          [cuentaId]
        );

        // 3. Eliminar la cuenta principal
        await trx(
          `
          DELETE FROM cuentas WHERE id_cuenta = ?
        `,
          [cuentaId]
        );
      });

      return res.status(200).json({
        success: true,
        message: 'Cuenta eliminada exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar la cuenta',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

export default withAuth(handler);
