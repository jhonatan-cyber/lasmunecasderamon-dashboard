/* eslint-disable */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: `Método ${req.method} no permitido`
    });
  }

  try {
    const {
      servicio_id,
      precio_servicio_temporal,
      precio_habitacion_temporal,
      iva_temporal,
      total_temporal,
      metodo_pago,
      tiempo_temporal
    } = req.body;

    // Validaciones
    if (!servicio_id || !precio_servicio_temporal || !tiempo_temporal) {
      return res.status(400).json({
        success: false,
        message: 'Faltan datos requeridos para generar comisiones temporales'
      });
    }

    const result = await withTransaction(async connection => {
      // Obtener información del servicio y sus anfitrionas
      const servicioInfo = (await connection(
        `
        SELECT 
          s.habitacion_id,
          s.codigo,
          COUNT(DISTINCT ds.usuario_id) as num_anfitrionas
        FROM servicios s
        LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
        WHERE s.id_servicio = ?
        GROUP BY s.id_servicio
      `,
        [servicio_id]
      )) as any[];

      if (!servicioInfo || servicioInfo.length === 0) {
        throw new Error('Servicio no encontrado');
      }

      const { habitacion_id, codigo, num_anfitrionas } = servicioInfo[0];
      const numAnfitrionas = parseInt(num_anfitrionas) || 1;

      // Obtener las anfitrionas del servicio
      const anfitrionas = (await connection(
        `
        SELECT usuario_id 
        FROM detalle_servicios 
        WHERE servicio_id = ?
      `,
        [servicio_id]
      )) as any[];

      if (anfitrionas.length === 0) {
        throw new Error('No se encontraron anfitrionas para el servicio');
      }

      // Obtener comisión de la habitación
      let comisionHabitacion = 0;
      let tieneComision = false;

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
          comisionHabitacion = Number(habitacionResult[0].comision_anfitriona);
          tieneComision = comisionHabitacion > 0;
        }
      }

      let comisionTotalPorAnfitriona = 0;

      if (tieneComision) {
        const comisionServicioPorAnfitriona = Math.floor(precio_servicio_temporal / numAnfitrionas);
        const comisionHabitacionPorAnfitriona = Math.floor(comisionHabitacion / numAnfitrionas);
        comisionTotalPorAnfitriona =
          comisionServicioPorAnfitriona + comisionHabitacionPorAnfitriona;
      } else {
        comisionTotalPorAnfitriona = Math.floor(precio_servicio_temporal / numAnfitrionas);
      }

      // Crear comisiones para cada anfitriona
      const { generateUUID } = await import('@/lib/db');
      for (const anfitriona of anfitrionas) {
        const comisionId = generateUUID();
        await connection(
          `INSERT INTO comisiones (
            id_comision,
            venta_id,
            servicio_id,
            monto
          ) VALUES (?, ?, ?, ?)`,
          [
            comisionId,
            null, // venta_id es null para servicios
            servicio_id,
            comisionTotalPorAnfitriona
          ]
        );

        await connection(
          `INSERT INTO detalle_comisiones (
            id_detalle_comision,
            comision_id,
            usuario_id,
            comision
          ) VALUES (?, ?, ?, ?)`,
          [generateUUID(), comisionId, anfitriona.usuario_id, comisionTotalPorAnfitriona]
        );
      }

      // Actualizar caja con los ingresos del servicio temporal
      const cajaActiva = (await connection(
        `SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1`
      )) as any[];

      if (cajaActiva && cajaActiva.length > 0) {
        const cajaId = cajaActiva[0].id_caja;

        let montoEfectivo = 0;
        let montoTarjeta = 0;
        let montoTransferencia = 0;

        switch (metodo_pago) {
          case 'tarjeta':
            montoTarjeta = total_temporal;
            break;
          case 'transferencia':
            montoTransferencia = total_temporal;
            break;
          default:
            montoEfectivo = total_temporal;
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
            total_temporal,
            montoEfectivo,
            montoTarjeta,
            montoTransferencia,
            iva_temporal || 0,
            comisionTotalPorAnfitriona * numAnfitrionas,
            cajaId
          ]
        );
      }

      return {
        comisiones_creadas: numAnfitrionas,
        comision_por_anfitriona: comisionTotalPorAnfitriona,
        total_comisiones: comisionTotalPorAnfitriona * numAnfitrionas,
        caja_actualizada: cajaActiva && cajaActiva.length > 0
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Comisiones temporales generadas exitosamente',
      data: result
    });
  } catch (error) {
    console.error('Error generating temporal commissions:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al generar comisiones temporales'
    });
  }
}

