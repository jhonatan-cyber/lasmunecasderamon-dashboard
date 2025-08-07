import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery } from '@/lib/db';
import { z } from 'zod';
import { sendNotificationToAll } from './notifications/sse';

const url = process.env.CORS_ORIGINS;
// Esquema de validación para crear/actualizar pedidos
const orderDetailSchema = z.object({
  productoId: z.number(),
  precio: z.number(),
  comision: z.number(),
  cantidad: z.number(),
  subtotal: z.number()
});

const orderUserSchema = z.object({
  usuarioId: z.number()
});

const orderSchema = z.object({
  codigo: z.string().min(1),
  meseroId: z.number(),
  clienteId: z.number(),
  subtotal: z.number(),
  total: z.number(),
  totalComision: z.number(),
  detalles: z.array(orderDetailSchema),
  usuarios: z.array(orderUserSchema)
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Usar el procedimiento almacenado get_all_order
    const results = await query('CALL get_all_order()', []);
    // Forzar el tipado para acceder a results[0] (procedimientos almacenados)
    const orders = Array.isArray((results as any)[0]) ? (results as any)[0] : results;
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error al obtener pedidos', error });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parse = orderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: parse.error.errors
      });
    }
    const { codigo, meseroId, clienteId, subtotal, total, totalComision, detalles, usuarios } =
      parse.data;

    // Iniciar transacción
    await rawQuery('START TRANSACTION');
    // Insertar pedido principal
    const result: any = await query(
      'INSERT INTO pedidos (codigo, mesero_id, cliente_id, subtotal, total, total_comision) VALUES (?, ?, ?, ?, ?, ?)',
      [codigo, meseroId, clienteId, subtotal, total, totalComision]
    );
    const pedidoId = result.insertId;

    // Insertar detalles
    for (const d of detalles) {
      await query(
        'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio, comision, cantidad, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [pedidoId, d.productoId, d.precio, d.comision, d.cantidad, d.subtotal]
      );
    }
    // Insertar usuarios
    for (const u of usuarios) {
      await query('INSERT INTO pedidos_usuarios (usuario_id, pedido_id) VALUES (?, ?)', [
        u.usuarioId,
        pedidoId
      ]);
    }
    await rawQuery('COMMIT');

    console.log('📤 Pedido creado exitosamente, ID:', pedidoId);

    // Obtener información del cliente y mesero para la notificación
    const clienteResults = await query('SELECT nombre, apellido FROM clientes WHERE id_cliente = ?', [clienteId]) as any[];
    const meseroResults = await query('SELECT nombre FROM usuarios WHERE id_usuario = ?', [meseroId]) as any[];
    const clienteResult = clienteResults[0];
    const meseroResult = meseroResults[0];
    
    const clienteNombre = clienteResult?.nombre || 'Cliente';
    const meseroNombre = meseroResult?.nombre || 'Mesero';
    
    console.log('📤 Información obtenida - Cliente:', clienteNombre, 'Mesero:', meseroNombre);
    
    // Enviar notificación en tiempo real
    const notificationData = {
      id: pedidoId,
      codigo,
      cliente: clienteNombre,
      mesero: meseroNombre,
      total: total,
      timestamp: new Date().toISOString(),
      createdBy: meseroId // Añadir el ID del usuario que creó el pedido
    };
    
    console.log('📤 Enviando notificación de nuevo pedido:', notificationData);
    sendNotificationToAll('new_order', notificationData);

    return res.status(201).json({
      success: true,
      message: 'Pedido creado correctamente',
      id: pedidoId
    });
  } catch (error) {
    await rawQuery('ROLLBACK');
    return res.status(500).json({ success: false, message: 'Error al crear pedido', error });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });
    await rawQuery('START TRANSACTION');
    await query('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
    await query('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
    await query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
    await rawQuery('COMMIT');
    return res.status(200).json({ success: true, message: 'Pedido eliminado correctamente' });
  } catch (error) {
    await rawQuery('ROLLBACK');
    return res.status(500).json({ success: false, message: 'Error al eliminar pedido', error });
  }
};

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Obtener lista de pedidos
 *     description: Obtiene la lista completa de pedidos del sistema con paginación y filtros
 *     tags: [Pedidos]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Número de elementos por página
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Término de búsqueda (número de pedido, cliente)
 *       - in: query
 *         name: estado
 *         schema:
 *           type: string
 *           enum: ['pendiente', 'en_proceso', 'completado', 'cancelado']
 *         description: Filtrar por estado del pedido
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para filtrar
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para filtrar
 *       - in: query
 *         name: cliente_id
 *         schema:
 *           type: integer
 *         description: Filtrar por cliente específico
 *     responses:
 *       200:
 *         description: Lista de pedidos obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 30
 *                     pages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Parámetros inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Error del servidor
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *   post:
 *     summary: Crear nuevo pedido
 *     description: Crea un nuevo pedido en el sistema
 *     tags: [Pedidos]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productos
 *               - total
 *             properties:
 *               cliente_id:
 *                 type: integer
 *                 example: 1
 *                 description: ID del cliente (opcional)
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_producto:
 *                       type: integer
 *                       example: 1
 *                     cantidad:
 *                       type: integer
 *                       example: 2
 *                     precio_unitario:
 *                       type: number
 *                       format: float
 *                       example: 25.00
 *                     observaciones:
 *                       type: string
 *                       example: "Sin hielo"
 *                 description: Lista de productos del pedido
 *               total:
 *                 type: number
 *                 format: float
 *                 example: 50.00
 *                 description: Total del pedido
 *               observaciones:
 *                 type: string
 *                 example: "Pedido para mesa 5"
 *                 description: Observaciones generales del pedido
 *               mesa:
 *                 type: string
 *                 example: "Mesa 5"
 *                 description: Número o identificador de mesa
 *               estado:
 *                 type: string
 *                 default: "pendiente"
 *                 enum: ['pendiente', 'en_proceso', 'completado', 'cancelado']
 *                 example: "pendiente"
 *                 description: Estado inicial del pedido
 *     responses:
 *       201:
 *         description: Pedido creado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Order'
 *                 message:
 *                   type: string
 *                   example: "Pedido creado exitosamente"
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Producto o cliente no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  switch (req.method) {
    case 'GET':
      return await handleGet(req, res);
    case 'POST':
      return await handlePost(req, res);
    case 'DELETE':
      return await handleDelete(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ success: false, message: `Método ${req.method} no permitido` });
  }
}
