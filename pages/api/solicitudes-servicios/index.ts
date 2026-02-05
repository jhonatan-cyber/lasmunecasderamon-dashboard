import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '../notifications/sse';

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      default:
        return res.status(405).json({ success: false, message: 'Método no permitido' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { estado } = req.query;

    let sql = `
      SELECT 
        ss.*,
        CONCAT(u_solicitado.nombre, ' ', u_solicitado.apellido) as solicitado_por_nombre,
        u_solicitado.nick as solicitado_por_nick,
        CONCAT(u_procesado.nombre, ' ', u_procesado.apellido) as procesado_por_nombre,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        h.nombre as habitacion_nombre,
        h.id_habitacion as habitacion_numero
      FROM solicitudes_servicios ss
      LEFT JOIN usuarios u_solicitado ON ss.solicitado_por = u_solicitado.id_usuario
      LEFT JOIN usuarios u_procesado ON ss.procesado_por = u_procesado.id_usuario
      LEFT JOIN clientes c ON ss.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON ss.habitacion_id = h.id_habitacion
    `;

    const params: any[] = [];

    if (estado) {
      sql += ' WHERE ss.estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY ss.fecha_solicitud DESC';

    const solicitudes = (await query(sql, params)) as any[];

    // Parsear anfitrionas_ids de JSON
    const solicitudesFormateadas = solicitudes.map((s: any) => ({
      ...s,
      anfitrionas_ids:
        typeof s.anfitrionas_ids === 'string' ? JSON.parse(s.anfitrionas_ids) : s.anfitrionas_ids
    }));

    return res.status(200).json({
      success: true,
      data: solicitudesFormateadas
    });
  } catch (error: any) {
    // Si la tabla no existe, devolver array vacío en lugar de error
    if (error?.code === 'ER_NO_SUCH_TABLE' || error?.message?.includes("doesn't exist")) {
      return res.status(200).json({
        success: true,
        data: [],
        message: 'Tabla no existe aún. Ejecuta la migración.'
      });
    }

    return res.status(500).json({ success: false, message: 'Error al obtener solicitudes' });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const {
      cliente_id,
      habitacion_id,
      precio_servicio,
      precio_habitacion,
      anfitrionas_ids,
      metodo_pago,
      tiempo,
      total,
      iva
    } = req.body;

    // @ts-ignore
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    if (!habitacion_id || !anfitrionas_ids || anfitrionas_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Habitación y anfitrionas son requeridos'
      });
    }

    const result = (await query(
      `INSERT INTO solicitudes_servicios 
        (cliente_id, habitacion_id, precio_servicio, precio_habitacion, anfitrionas_ids, 
         metodo_pago, tiempo, total, iva, solicitado_por) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_id || null,
        habitacion_id,
        precio_servicio || 0,
        precio_habitacion || 0,
        JSON.stringify(anfitrionas_ids),
        metodo_pago,
        tiempo,
        total,
        iva || 0,
        userId
      ]
    )) as any;

    // Enviar notificación a cajeros y administradores
    await notificarCajeros(result.insertId);

    // Obtener info adicional para la notificación
    const solicitudInfo = (await query(
      `SELECT ss.id_solicitud, ss.total, ss.habitacion_id, ss.tiempo,
              h.nombre as habitacion_nombre,
              CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
              CONCAT(u.nombre, ' ', u.apellido) as solicitado_por_nombre,
              u.nick as solicitado_por_nick
       FROM solicitudes_servicios ss
       LEFT JOIN habitaciones h ON ss.habitacion_id = h.id_habitacion
       LEFT JOIN clientes c ON ss.cliente_id = c.id_cliente
       LEFT JOIN usuarios u ON ss.solicitado_por = u.id_usuario
       WHERE ss.id_solicitud = ?
       LIMIT 1`,
      [result.insertId]
    )) as any[];

    const info = solicitudInfo && solicitudInfo.length > 0 ? solicitudInfo[0] : null;

    // Enviar notificación SSE a todos los clientes conectados
    sendNotificationToAll('new_service_request', {
      id: result.insertId,
      tipo: 'servicio',
      total: total,
      createdBy: userId,
      habitacion_id: habitacion_id,
      habitacion_nombre: info?.habitacion_nombre || null,
      tiempo: tiempo,
      cliente: info?.cliente_nombre || null,
      solicitado_por_nombre: info?.solicitado_por_nombre || null,
      solicitado_por_nick: info?.solicitado_por_nick || null,
      timestamp: new Date().toISOString()
    });

    return res.status(201).json({
      success: true,
      message: 'Solicitud de servicio creada exitosamente',
      data: { id_solicitud: result.insertId }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al crear solicitud' });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    // @ts-ignore
    const userRole = req.user?.role;

    const roleLower = (userRole || '').toLowerCase();
    if (roleLower !== 'cajero' && roleLower !== 'administrador') {
      return res.status(403).json({ success: false, message: 'No tienes permisos para eliminar' });
    }

    if (!id) {
      return res.status(400).json({ success: false, message: 'ID requerido' });
    }

    await query('DELETE FROM solicitudes_servicios WHERE id_solicitud = ?', [id]);

    return res.status(200).json({ success: true, message: 'Solicitud eliminada' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al eliminar solicitud' });
  }
};

const notificarCajeros = async (solicitudId: number) => {
  try {
    // Obtener cajeros y administradores para logging
    const usuarios = (await query(
      `SELECT u.id_usuario, u.nombre, u.apellido, r.nombre as rol_nombre
       FROM usuarios u
       INNER JOIN roles r ON u.rol_id = r.id_rol
       WHERE (r.nombre = 'cajero' OR r.nombre = 'administrador') AND u.estado = 1`
    )) as any[];
  } catch (error) {
    console.error('Error al notificar cajeros:', error);
  }
};

export default withAuth(handler);
