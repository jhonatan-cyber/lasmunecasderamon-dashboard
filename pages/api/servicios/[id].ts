import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({
      success: false,
      message: 'ID de servicio es requerido'
    });
  }

  const servicioId = parseInt(id);

  if (req.method === 'GET') {
    try {
      // Obtener servicio con detalles
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
          c.nombre as cliente_nombre,
          h.nombre as habitacion_numero
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
        WHERE s.id_servicio = ?
      `,
        [servicioId]
      )) as any[];

      if (!servicios || servicios.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      const servicio = servicios[0] as any;

      // Obtener usuarios asociados
      const usuarios = await query(
        `
        SELECT 
          u.id_usuario,
          u.nombre,
          u.apellido,
          u.nick
        FROM detalle_servicios ds
        INNER JOIN usuarios u ON u.id_usuario = ds.usuario_id
        WHERE ds.servicio_id = ?
      `,
        [servicioId]
      );

      // Obtener detalles
      const detalles = await query(
        `
        SELECT 
          ds.id_detalle_servicio,
          ds.usuario_id,
          ds.servicio_id,
          u.nombre as usuario_nombre
        FROM detalle_servicios ds
        LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
        WHERE ds.servicio_id = ?
      `,
        [servicioId]
      );

      const servicioCompleto = {
        ...servicio,
        usuarios: usuarios || [],
        detalles: detalles || []
      };

      return res.status(200).json({
        success: true,
        data: servicioCompleto
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al obtener servicio'
      });
    }
  } else if (req.method === 'PUT') {
    try {
      const {
        cliente_id,
        habitacion_id,
        precio_habitacion,
        precio_servicio,
        iva,
        sub_total,
        total,
        tiempo,
        usuarios
      } = req.body;

      // Validaciones
      if (!cliente_id || !precio_servicio || !tiempo) {
        return res.status(400).json({
          success: false,
          message: 'Cliente, precio de servicio y tiempo son requeridos'
        });
      }

      // Obtener IVA previo para calcular delta y ajustar caja
      const [servicioPrevio] = (await query(`SELECT iva FROM servicios WHERE id_servicio = ?`, [
        servicioId
      ])) as any[];

      const ivaPrevio = Number(servicioPrevio?.iva || 0);
      const ivaNuevo = Number(iva || 0);
      const ivaDelta = ivaNuevo - ivaPrevio;

      // Actualizar servicio
      await query(
        `
        UPDATE servicios SET
          cliente_id = ?,
          habitacion_id = ?,
          precio_habitacion = ?,
          precio_servicio = ?,
          iva = ?,
          sub_total = ?,
          total = ?,
          tiempo = ?
        WHERE id_servicio = ?
      `,
        [
          cliente_id,
          habitacion_id,
          precio_habitacion || 0,
          precio_servicio,
          ivaNuevo,
          sub_total,
          total,
          tiempo,
          servicioId
        ]
      );

      // Ajustar IVA en caja abierta con el delta
      if (ivaDelta !== 0) {
        const cajaActiva = (await query(
          `SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`
        )) as any[];

        if (Array.isArray(cajaActiva) && cajaActiva.length > 0) {
          const cajaId = cajaActiva[0].id_caja;
          await query(`UPDATE cajas SET iva = GREATEST(0, iva + ?) WHERE id_caja = ?`, [
            ivaDelta,
            cajaId
          ]);
        }
      }

      // Eliminar detalles existentes
      await query('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);

      // Insertar nuevos detalles
      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        for (const usuarioId of usuarios) {
          await query('INSERT INTO detalle_servicios (usuario_id, servicio_id) VALUES (?, ?)', [
            usuarioId,
            servicioId
          ]);
        }
      }

      return res.status(200).json({
        success: true,
        message: 'Servicio actualizado exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar servicio'
      });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { estado } = req.body;

      // Validar estado
      if (estado === undefined || ![0, 1, 2, 3].includes(estado)) {
        return res.status(400).json({
          success: false,
          message: 'Estado debe ser 0 (finalizado), 1 (activo), 2 (pendiente) o 3 (devuelto)'
        });
      }

      // Actualizar estado del servicio
      await query('UPDATE servicios SET estado = ? WHERE id_servicio = ?', [estado, servicioId]);

      // Si se está finalizando el servicio (estado = 0), liberar la habitación
      if (estado === 0) {
        await query(
          'UPDATE habitaciones h INNER JOIN servicios s ON h.id_habitacion = s.habitacion_id SET h.estado = 1 WHERE s.id_servicio = ?',
          [servicioId]
        );
      }

      return res.status(200).json({
        success: true,
        message:
          estado === 0 ? 'Servicio finalizado exitosamente' : 'Servicio activado exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al actualizar estado del servicio'
      });
    }
  } else if (req.method === 'DELETE') {
    try {
      // Eliminar detalles primero
      await query('DELETE FROM detalle_servicios WHERE servicio_id = ?', [servicioId]);

      // Eliminar servicio
      await query('DELETE FROM servicios WHERE id_servicio = ?', [servicioId]);

      return res.status(200).json({
        success: true,
        message: 'Servicio eliminado exitosamente'
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error al eliminar servicio'
      });
    }
  } else {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }
}
