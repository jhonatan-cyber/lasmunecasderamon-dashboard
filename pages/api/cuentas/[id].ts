import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

      // Obtener la cuenta principal
      const cuentaResult = (await query(
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
        return res.status(404).json({
          success: false,
          message: 'Cuenta no encontrada'
        });
      }

      const cuenta = cuentaResult[0];

      // Obtener detalles de la cuenta con productos
      const detallesResult = await query(
        `
        SELECT 
          DC.precio, 
          DC.cantidad, 
          DC.sub_total, 
          DC.comision, 
          DC.hostess_id,
          DC.fecha_crea,
          PR.nombre AS producto, 
          PR.id_producto
        FROM detalle_cuentas DC 
        LEFT JOIN productos PR ON PR.id_producto = DC.producto_id
        WHERE DC.cuenta_id = ?
      `,
        [cuentaId]
      );

      // Obtener usuarios asociados con nick
      const usuariosResult = await query(
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

      const cuentaCompleta = {
        ...cuenta,
        detalles: Array.isArray(detallesResult) ? detallesResult : [],
        usuarios: Array.isArray(usuariosResult) ? usuariosResult : []
      };

      return res.status(200).json(cuentaCompleta);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener la cuenta',
        error: error instanceof Error ? error.message : String(error)
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const { estado, detalles, usuarios } = req.body;
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

          // Insertar nuevos detalles (sin eliminar los existentes)
          for (const detalle of detalles) {
            await trx(
              `
              INSERT INTO detalle_cuentas (
                cuenta_id, producto_id, precio, cantidad, sub_total, comision, hostess_id, fecha_crea
              ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `,
              [
                cuentaId,
                detalle.producto_id,
                detalle.precio,
                detalle.cantidad,
                detalle.sub_total,
                detalle.comision,
                detalle.hostess_id || (detalle.hostesses && detalle.hostesses[0]) || null
              ]
            );
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
