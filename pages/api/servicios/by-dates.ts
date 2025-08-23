import type { NextApiRequest, NextApiResponse } from 'next';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { query } from '@/lib/db';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const userData = getCurrentUser(req);
    if (!userData) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const userId = userData.id;
    const { dates, startDate, endDate } = req.query;

    // Construir la consulta base
    let queryString = `
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
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        h.nombre as habitacion_numero,
        CONCAT(u.nombre, ' ', u.apellido) AS usuario
      FROM servicios s
      LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
      WHERE ds.usuario_id = ?
    `;

    const queryParams: (number | string)[] = [userId];

    // Si se proporcionan fechas específicas
    if (dates) {
      let dateArray: string[];
      if (Array.isArray(dates)) {
        dateArray = dates;
      } else {
        // Si es un string, dividir por comas
        dateArray = dates.split(',').map(date => date.trim());
      }
      
      if (dateArray.length > 0) {
        const placeholders = dateArray.map(() => 'DATE(?)').join(',');
        queryString += ` AND DATE(s.fecha_crea) IN (${placeholders})`;
        queryParams.push(...dateArray);
      }
    }
    // Si se proporciona rango de fechas
    else if (startDate && endDate) {
      queryString += ` AND DATE(s.fecha_crea) BETWEEN ? AND ?`;
      queryParams.push(startDate as string, endDate as string);
    }

    queryString += ` ORDER BY s.fecha_crea DESC`;

    // Obtener servicios del usuario
    const servicios = (await query(queryString, queryParams)) as any[];

    // Mapear los estados para mejor legibilidad
    const serviciosWithStatus = servicios.map(item => ({
      ...item,
      estado_texto: item.estado === 0 ? 'PAGADO' : 'POR PAGAR'
    }));

    return res.status(200).json({
      success: true,
      data: serviciosWithStatus,
      count: serviciosWithStatus.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
}

export default withAuth(handler);
