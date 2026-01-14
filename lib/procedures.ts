import { query } from './db';

/**
 * Agregar un cliente
 * Reemplaza: CALL add_client(run, name, lastName, phone)
 */
export const addClient = async (
  run: string,
  name: string,
  lastName: string,
  phone: string
) => {
  return await query(
    'INSERT INTO clientes (run, nombre, apellido, telefono) VALUES (?, ?, ?, ?)',
    [run, name, lastName, phone]
  );
};

/**
 * Obtener todos los clientes
 * Reemplaza: CALL get_all_client()
 */
export const getAllClients = async () => {
  console.log('[PROCEDURES] getAllClients called');
  const result = await query('SELECT * FROM clientes WHERE estado = 1 ORDER BY nombre ASC');
  console.log('[PROCEDURES] getAllClients result count:', Array.isArray(result) ? result.length : 1);
  return result;
};

/**
 * Obtener cliente por ID
 * Reemplaza: CALL get_client_by_id(id)
 */
export const getClientById = async (id: number) => {
  return await query('SELECT * FROM clientes WHERE id_cliente = ?', [id]);
};

/**
 * Actualizar cliente
 * Reemplaza: CALL update_client(run, name, lastName, phone, id)
 */
export const updateClient = async (
  run: string,
  name: string,
  lastName: string,
  phone: string,
  id: number
) => {
  return await query(
    'UPDATE clientes SET run = ?, nombre = ?, apellido = ?, telefono = ?, fecha_mod = NOW() WHERE id_cliente = ?',
    [run, name, lastName, phone, id]
  );
};

/**
 * Eliminar cliente
 * Reemplaza: CALL delete_client(id)
 */
export const deleteClient = async (id: number) => {
  return await query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
};

/**
 * Obtener todos los pedidos con detalles
 * Reemplaza: CALL get_all_order()
 */
export const getAllOrders = async () => {
  return await query(`
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
