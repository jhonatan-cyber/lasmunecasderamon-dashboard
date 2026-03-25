import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { toDateKey } from '@/lib/calendarUtils';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'startDate y endDate son requeridos'
      });
    }

    // Obtener todas las acciones en el rango de fechas usando consultas separadas
    const allActions: any[] = [];

    // 1. Ventas
    try {
      const ventas = await query(`
        SELECT 
          'venta' as tipo,
          DATE_FORMAT(v.fecha_crea, '%Y-%m-%d') as fecha,
          v.codigo,
          COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Cliente no disponible') as cliente,
          v.total,
          v.estado,
          'Venta registrada' as descripcion
        FROM ventas v
        LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
        WHERE DATE(v.fecha_crea) BETWEEN ? AND ?
      `, [startDate, endDate]) as any[];
      allActions.push(...ventas);
    } catch (error) {
      console.error('Error al obtener ventas:', error);
    }

    // 2. Servicios
    try {
      const servicios = await query(`
        SELECT 
          'servicio' as tipo,
          DATE_FORMAT(s.fecha_crea, '%Y-%m-%d') as fecha,
          s.codigo,
          COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Cliente no disponible') as cliente,
          s.total,
          s.estado,
          'Servicio registrado' as descripcion
        FROM servicios s
        LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
        WHERE DATE(s.fecha_crea) BETWEEN ? AND ?
      `, [startDate, endDate]) as any[];
      allActions.push(...servicios);
    } catch (error) {
      console.error('Error al obtener servicios:', error);
    }

    // 3. Asistencias
    try {
      const asistencias = await query(`
        SELECT 
          'asistencia' as tipo,
          DATE_FORMAT(a.fecha, '%Y-%m-%d') as fecha,
          CONCAT(u.nombre, ' ', u.apellido) as codigo,
          CONCAT(u.nombre, ' ', u.apellido) as cliente,
          CASE 
            WHEN a.estado = 1 THEN 1
            WHEN a.estado = 2 THEN 0.5
            ELSE 0
          END as total,
          a.estado,
          CASE 
            WHEN a.estado = 1 THEN 'Asistencia registrada'
            ELSE 'Ausencia registrada'
          END as descripcion
        FROM asistencias a
        INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
        WHERE DATE(a.fecha) BETWEEN ? AND ?
      `, [startDate, endDate]) as any[];
      allActions.push(...asistencias);
    } catch (error) {
      console.error('Error al obtener asistencias:', error);
    }

    // 4. Propinas
    try {
      const propinas = await query(`
        SELECT 
          'propina' as tipo,
          DATE_FORMAT(p.fecha_crea, '%Y-%m-%d') as fecha,
          v.codigo,
          COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Cliente no disponible') as cliente,
          p.propina as total,
          p.estado,
          'Propina registrada' as descripcion
        FROM propinas p
        INNER JOIN ventas v ON v.id_venta = p.venta_id
        LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
        WHERE DATE(p.fecha_crea) BETWEEN ? AND ?
      `, [startDate, endDate]) as any[];
      allActions.push(...propinas);
    } catch (error) {
      console.error('Error al obtener propinas:', error);
    }

    // 5. Anticipos
    try {
      const anticipos = await query(`
        SELECT 
          'anticipo' as tipo,
          DATE_FORMAT(a.fecha_crea, '%Y-%m-%d') as fecha,
          CONCAT(u.nombre, ' ', u.apellido) as codigo,
          CONCAT(u.nombre, ' ', u.apellido) as cliente,
          a.monto as total,
          a.estado,
          'Anticipo registrado' as descripcion
        FROM anticipos a
        INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
        WHERE DATE(a.fecha_crea) BETWEEN ? AND ?
      `, [startDate, endDate]) as any[];
      allActions.push(...anticipos);
    } catch (error) {
      console.error('Error al obtener anticipos:', error);
    }

    // 6. Horas Extras
    try {
      const horasExtras = await query(`
        SELECT 
          'hora_extra' as tipo,
          DATE_FORMAT(he.fecha_crea, '%Y-%m-%d') as fecha,
          CONCAT(u.nombre, ' ', u.apellido) as codigo,
          CONCAT(u.nombre, ' ', u.apellido) as cliente,
          he.total as total,
          he.estado,
          'Hora extra registrada' as descripcion
        FROM horas_extras he
        INNER JOIN usuarios u ON u.id_usuario = he.usuario_id
        WHERE DATE(he.fecha_crea) BETWEEN ? AND ?
      `, [startDate, endDate]) as any[];
      allActions.push(...horasExtras);
    } catch (error) {
      console.error('Error al obtener horas extras:', error);
    }

    // Ordenar todas las acciones por fecha
    const actions = allActions.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    // Agrupar acciones por fecha
    const actionsByDate: { [key: string]: any[] } = {};
    
    actions.forEach(action => {
      // Como ya viene formateada de SQL como YYYY-MM-DD, toDateKey solo asegura compatibilidad
      const dateKey = toDateKey(action.fecha);
      
      if (!actionsByDate[dateKey]) {
        actionsByDate[dateKey] = [];
      }
      actionsByDate[dateKey].push(action);
    });

    return res.status(200).json({
      success: true,
      data: actionsByDate
    });

  } catch (error: any) {
    console.error('Error al obtener acciones del calendario:', error);
    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  }
}
