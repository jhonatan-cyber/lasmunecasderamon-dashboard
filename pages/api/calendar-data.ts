import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

interface ServicioData {
  id_servicio: string;
  codigo: string;
  tiempo: number;
  fecha_crea: string;
  precio_servicio: number;
  precio_habitacion: number;
  iva: number;
  id_habitacion: string;
  sub_total: number;
  total: number;
  metodo_pago: string;
  habitacion: string;
  anfitriona: string;
  cliente: string;
  fecha_mod: string | null;
  anfitrionaId: string;
  id_cliente: string;
  estado: number;
}

interface VentaData {
  id_venta: string;
  habitacion: string | null;
  codigo: string;
  metodo_pago: string;
  propina: number;
  sub_total: number;
  total: number;
  fecha_crea: string;
  fecha_mod: string | null;
  total_comision: number;
  estado: number;
  precio: number | null;
  cliente: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    logger.info('Calendar Data API - Inicio de request', { 
      method: req.method, 
      query: req.query 
    });

    if (req.method !== 'GET') {
      logger.warn('Método no permitido:', req.method);
      return res.status(405).json({ message: 'Método no permitido' });
    }

    const { startDate, endDate, type } = req.query;

    logger.info('Parámetros recibidos:', { startDate, endDate, type });

    if (!startDate || !endDate) {
      logger.error('Parámetros faltantes:', { startDate, endDate });
      return res.status(400).json({ message: 'startDate y endDate son requeridos' });
    }

    if (!type || (type !== 'servicios' && type !== 'ventas')) {
      logger.error('Tipo inválido:', { type });
      return res.status(400).json({ message: 'type debe ser "servicios" o "ventas"' });
    }

    logger.info(`Obteniendo datos de ${type} para el rango: ${startDate} - ${endDate}`);

    if (type === 'servicios') {
      try {
        const serviciosQuery = `
          SELECT 
            S.id_servicio, 
            S.codigo, 
            S.tiempo, 
            S.fecha_crea, 
            S.precio_servicio, 
            S.precio_habitacion, 
            S.iva, 
            H.id_habitacion, 
            S.sub_total, 
            S.total, 
            S.metodo_pago, 
            H.nombre AS habitacion, 
            GROUP_CONCAT(U.nick SEPARATOR ', ') AS anfitriona,
            CONCAT(CL.nombre, ' ', CL.apellido) AS cliente, 
            S.fecha_mod, 
            GROUP_CONCAT(U.id_usuario SEPARATOR ', ') AS anfitrionaId,
            CL.id_cliente, 
            S.estado
          FROM servicios S
          LEFT JOIN habitaciones H ON H.id_habitacion = S.habitacion_id
          LEFT JOIN clientes CL ON CL.id_cliente = S.cliente_id
          LEFT JOIN detalle_servicios DS ON DS.servicio_id = S.id_servicio
          LEFT JOIN usuarios U ON U.id_usuario = DS.usuario_id
          WHERE 1 = 1 
            AND DATE(S.fecha_crea) BETWEEN ? AND ?
          GROUP BY 
            S.id_servicio, S.codigo, S.tiempo, S.fecha_crea, 
            S.precio_servicio, S.precio_habitacion, S.iva, H.id_habitacion, 
            S.sub_total, S.total, S.metodo_pago, H.nombre, 
            CL.nombre, CL.apellido, S.fecha_mod, 
            CL.id_cliente, S.estado
          ORDER BY S.fecha_crea ASC
        `;

        logger.info('Ejecutando query de servicios:', { startDate, endDate });
        logger.info('Query SQL:', serviciosQuery);
        
        const servicios = await query(serviciosQuery, [startDate, endDate]) as ServicioData[];
        
        logger.info(`Se encontraron ${servicios.length} servicios`);
        return res.status(200).json({ data: servicios, type: 'servicios' });
      } catch (queryError) {
        logger.error('Error específico en query de servicios:', queryError);
        throw queryError;
      }
    }

    if (type === 'ventas') {
      try {
        const ventasQuery = `
          SELECT 
            V.id_venta, 
            H.nombre AS habitacion, 
            V.codigo, 
            V.metodo_pago, 
            V.propina, 
            V.sub_total, 
            V.total, 
            V.fecha_crea, 
            V.fecha_mod, 
            V.total_comision, 
            V.estado, 
            H.precio,
            COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente
          FROM ventas V
          LEFT JOIN clientes CL ON CL.id_cliente = V.cliente_id
          LEFT JOIN habitaciones H ON H.id_habitacion = V.habitacion_id 
          WHERE 1 = 1 
            AND DATE(V.fecha_crea) BETWEEN ? AND ?
          ORDER BY V.fecha_crea ASC
        `;

        logger.info('Ejecutando query de ventas:', { startDate, endDate });
        logger.info('Query SQL:', ventasQuery);
        
        const ventas = await query(ventasQuery, [startDate, endDate]) as VentaData[];
        
        logger.info(`Se encontraron ${ventas.length} ventas`);
        return res.status(200).json({ data: ventas, type: 'ventas' });
      } catch (queryError) {
        logger.error('Error específico en query de ventas:', queryError);
        throw queryError;
      }
    }

  } catch (error) {
    logger.error('Error al obtener datos del calendario:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      query: req.query
    });
    
    return res.status(500).json({ 
      message: 'Error interno del servidor',
      details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined,
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}
