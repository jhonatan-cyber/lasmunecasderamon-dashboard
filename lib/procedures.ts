import { query, generateUUID, TransactionQuery } from './db';
import { logger } from './logger';
import { Client } from '@/types/client';

export interface OrderListItem {
  id_pedido: string;
  cliente: string;
  codigo: string;
  garzon: string;
  nicks: string;
  subtotal: number;
  total: number;
  estado: number;
}

/**
 * Agrega un nuevo cliente a la base de datos.
 */
export const addClient = async (
  run: string,
  name: string,
  lastName: string,
  phone: string
): Promise<any> => {
  const id = generateUUID();
  return await query(
    'INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono) VALUES (?, ?, ?, ?, ?)',
    [id, run, name, lastName, phone]
  );
};

/**
 * Obtiene todos los clientes activos.
 */
export const getAllClients = async (): Promise<Client[]> => {
  logger.info('[PROCEDURES] getAllClients called');
  const result = await query<Client[]>('SELECT * FROM clientes WHERE estado = 1 ORDER BY nombre ASC');
  logger.info('[PROCEDURES] getAllClients result count', {
    count: Array.isArray(result) ? result.length : 1,
  });
  return result;
};

/**
 * Obtener cliente por ID.
 */
export const getClientById = async (id: string): Promise<Client | null> => {
  const result = await query<Client[]>('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
  return result.length > 0 ? result[0] : null;
};

/**
 * Actualizar cliente.
 */
export const updateClient = async (
  run: string,
  name: string,
  lastName: string,
  phone: string,
  id: string
): Promise<any> => {
  return await query(
    'UPDATE clientes SET run = ?, nombre = ?, apellido = ?, telefono = ?, fecha_mod = NOW() WHERE id_cliente = ?',
    [run, name, lastName, phone, id]
  );
};

/**
 * Eliminar cliente (soft delete o físico según lógica).
 */
export const deleteClient = async (id: string): Promise<any> => {
  return await query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
};

/**
 * Obtener todos los pedidos con detalles unificados.
 */
export const getAllOrders = async (): Promise<OrderListItem[]> => {
  return await query<OrderListItem[]>(`
    SELECT
      P.id_pedido,
      CONCAT(CL.nombre, ' ', CL.apellido) AS cliente,
      P.codigo,
      CONCAT(U.nombre, ' ', U.apellido) AS garzon,
      (
        SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ')
        FROM pedidos_usuarios PU
        INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id
        WHERE PU.pedido_id = P.id_pedido
      ) AS nicks,
      P.subtotal,
      P.total,
      P.estado
    FROM pedidos P
    LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
    LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
    WHERE P.estado = 1
  `);
};
/**
 * Obtener lista completa de usuarios con su rol.
 */
export const getUsersList = async (): Promise<any[]> => {
  return await query(`
    SELECT u.*, r.nombre as rol_nombre, r.id_rol 
    FROM usuarios u 
    LEFT JOIN roles r ON u.rol_id = r.id_rol
  `);
};

/**
 * Obtener anfitrionas con estado de servicio y habitación actual.
 */
export const getAnfitrionas = async (): Promise<any[]> => {
  return await query(`
    SELECT 
      u.*, 
      r.nombre as rol_nombre, 
      r.id_rol,
      (
        SELECT COUNT(*) 
        FROM servicios s 
        INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id 
        WHERE ds.usuario_id = u.id_usuario AND s.estado = 2
      ) as en_servicio,
      (
        SELECT h.nombre 
        FROM servicios s 
        INNER JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id 
        INNER JOIN habitaciones h ON s.habitacion_id = h.id_habitacion 
        WHERE ds.usuario_id = u.id_usuario AND s.estado = 2 
        LIMIT 1
      ) as habitacion_nombre 
    FROM usuarios u 
    LEFT JOIN roles r ON u.rol_id = r.id_rol 
    WHERE r.nombre = 'anfitriona'
  `);
};

/**
 * Obtener estadísticas globales de comisiones.
 */
export const getCommissionStats = async (fechaApertura: string) => {
  const STATS_QUERY = `
    SELECT 
      COALESCE(SUM(CASE WHEN C.venta_id != '' AND C.venta_id IS NOT NULL THEN DC.comision ELSE 0 END), 0) AS total_ventas,
      COALESCE(SUM(CASE WHEN C.servicio_id != '' AND C.servicio_id IS NOT NULL THEN DC.comision ELSE 0 END), 0) AS total_servicios,
      COALESCE(SUM(DC.comision), 0) AS total_comisiones,
      COALESCE(AVG(DC.comision), 0) AS promedio_comision,
      COUNT(DISTINCT U.id_usuario) AS cantidad_comisiones,
      COALESCE(MIN(DC.comision), 0) AS comision_minima,
      COALESCE(MAX(DC.comision), 0) AS comision_maxima,
      COALESCE(ROUND((SUM(CASE WHEN C.venta_id != '' AND C.venta_id IS NOT NULL THEN DC.comision ELSE 0 END) * 100.0) / NULLIF(SUM(DC.comision), 0)), 0) AS porcentaje_ventas,
      COALESCE(ROUND((SUM(CASE WHEN C.servicio_id != '' AND C.servicio_id IS NOT NULL THEN DC.comision ELSE 0 END) * 100.0) / NULLIF(SUM(DC.comision), 0)), 0) AS porcentaje_servicios
    FROM comisiones C
    INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
    INNER JOIN usuarios U ON U.id_usuario = DC.usuario_id
    WHERE C.fecha_crea >= ? AND C.estado = 1 AND DC.comision > 0;
  `;
  const result = await query<any[]>(STATS_QUERY, [fechaApertura]);
  return result[0];
};

/**
 * Obtener lista de comisiones agrupadas por anfitriona.
 */
export const getCommissionsList = async (whereClause: string, params: any[]) => {
  const sql = `
    SELECT 
      U.id_usuario, U.nick, CONCAT(U.nombre, ' ', U.apellido) AS anfitriona,
      COALESCE(SUM(CASE WHEN C.venta_id != '' AND C.venta_id IS NOT NULL THEN DC.comision ELSE 0 END), 0) AS venta,
      COALESCE(SUM(CASE WHEN C.servicio_id != '' AND C.servicio_id IS NOT NULL THEN DC.comision ELSE 0 END), 0) AS servicio,
      SUM(DC.comision) AS total,
      C.estado
    FROM comisiones C
    INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
    INNER JOIN usuarios U ON U.id_usuario = DC.usuario_id
    ${whereClause}
    GROUP BY U.id_usuario, U.nick, U.nombre, U.apellido, C.estado
    ORDER BY anfitriona ASC
  `;
  return await query<any[]>(sql, params);
};
/**
 * Obtener la caja abierta actual con info de usuario.
 */
export const getActiveCaja = async (): Promise<any | null> => {
  const result = await query<any[]>(`
    SELECT c.*, CONCAT(u.nombre, ' ', u.apellido) as usuario_apertura
    FROM cajas c
    LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
    WHERE c.estado = 1
    ORDER BY c.fecha_apertura DESC LIMIT 1
  `);
  return result.length > 0 ? result[0] : null;
};

/**
 * Obtener estadísticas de ventas y servicios desde una fecha específica.
 */
export const getCajaStats = async (fechaApertura: string) => {
  const resultVentas = await query<any[]>(`
    SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio
    FROM ventas WHERE estado = 1 AND fecha_crea >= ?
  `, [fechaApertura]);
  
  const resultServicios = await query<any[]>(`
    SELECT COUNT(*) AS cantidad, COALESCE(AVG(total), 0) AS promedio
    FROM servicios WHERE estado = 1 AND fecha_crea >= ?
  `, [fechaApertura]);

  return { 
    ventas: resultVentas[0], 
    servicios: resultServicios[0] 
  };
};

/**
 * Cerrar sesiones de todos los usuarios que no sean administradores ni cajeros.
 */
export const closeNonAdminSessions = async () => {
  return await query(`
    UPDATE logins l
    INNER JOIN usuarios u ON l.usuario_id = u.id_usuario
    INNER JOIN roles r ON u.rol_id = r.id_rol
    SET l.estado = 0
    WHERE l.estado = 1 AND r.nombre NOT IN ('administrador', 'cajero')
  `);
};
/**
 * Obtener lista de ventas procesada.
 */
export const getSalesList = async (whereClause: string, params: any[], limit: number, offset: number) => {
  const sql = `
    SELECT 
      v.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
      h.nombre as habitacion_nombre,
      GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as usuarios_nicks
    FROM ventas v 
    LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
    LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
    LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
    LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
    ${whereClause}
    GROUP BY v.id_venta
    ORDER BY v.fecha_crea DESC 
    LIMIT ? OFFSET ?
  `;
  return await query<any[]>(sql, [...params, limit, offset]);
};

/**
 * Obtener resumen estadístico de ventas.
 */
export const getSalesResumen = async (whereClause: string, params: any[]) => {
  const sql = `
    SELECT 
      COUNT(*) as total_ventas,
      SUM(total) as total_ventas_monto,
      SUM(CASE WHEN metodo_pago = 'efectivo' THEN total ELSE 0 END) as total_efectivo,
      SUM(CASE WHEN metodo_pago = 'tarjeta' THEN total ELSE 0 END) as total_tarjeta,
      SUM(CASE WHEN metodo_pago = 'prepago' THEN total ELSE 0 END) as total_prepago,
      SUM(propina) as total_propinas
    FROM ventas v 
    ${whereClause}
  `;
  const result = await query<any[]>(sql, params);
  return result[0];
};
/**
 * Obtener lista de servicios con todos sus joins.
 */
export const getServiciosList = async (whereClause: string, params: any[], limit: number, offset: number) => {
  const sql = `
    SELECT 
      s.*, h.nombre as habitacion_numero, h.comision_anfitriona as habitacion_comision,
      GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as anfitrionas_nombres,
      GROUP_CONCAT(DISTINCT u.id_usuario SEPARATOR ',') as anfitrionas_ids
    FROM servicios s
    LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
    LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
    LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
    ${whereClause}
    GROUP BY s.id_servicio
    ORDER BY s.fecha_crea DESC
    LIMIT ? OFFSET ?
  `;
  return await query<any[]>(sql, [...params, limit, offset]);
};

/**
 * Pausar servicios activos de las mismas anfitrionas.
 */
export const pauseConflictingServices = async (trx: TransactionQuery, currentServicioId: string, hostesses: string[]) => {
  if (hostesses.length === 0) return [];
  const placeholders = hostesses.map(() => '?').join(',');
  const sql = `
    SELECT DISTINCT s.id_servicio 
    FROM servicios s 
    JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id 
    JOIN habitaciones h ON s.habitacion_id = h.id_habitacion 
    WHERE s.estado = 2 AND s.id_servicio != ? AND s.paused_at IS NULL 
    AND ds.usuario_id IN (${placeholders}) 
    AND (h.precio > 0 OR h.comision_anfitriona > 0 OR h.tiempo > 0)
  `;
  const toPause = await trx<any[]>(sql, [currentServicioId, ...hostesses]);
  for (const s of toPause) {
    await trx('UPDATE servicios SET estado = 3, paused_at = NOW() WHERE id_servicio = ?', [s.id_servicio]);
  }
  return toPause;
};
/**
 * Obtener lista de productos con su categoría.
 */
export const getProductsList = async (categoryId?: string) => {
  let where = 'WHERE 1=1';
  let params: any[] = [];
  if (categoryId) {
    where = 'WHERE P.categoria_id = ?';
    params.push(categoryId);
  }
  const sql = `
    SELECT P.*, C.nombre AS categoria
    FROM productos P
    INNER JOIN categorias C ON C.id_categoria = P.categoria_id
    ${where}
    ORDER BY P.categoria_id ASC, P.display_order ASC, P.id_producto ASC
  `;
  return await query<any[]>(sql, params);
};

/**
 * Verificar si un producto ya existe por código o nombre en una categoría.
 */
export const checkProductExists = async (code: string, name: string, categoryId: string, excludeId?: string) => {
  const sql = `
    SELECT id_producto FROM productos 
    WHERE (codigo = ? OR (LOWER(nombre) = LOWER(?) AND categoria_id = ?))
    ${excludeId ? 'AND id_producto != ?' : ''}
    LIMIT 1
  `;
  const params = [code, name, categoryId];
  if (excludeId) params.push(excludeId);
  const result = await query<any[]>(sql, params);
  return result.length > 0;
};
