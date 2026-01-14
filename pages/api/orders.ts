import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery } from '@/lib/db';
import { getAllOrders } from '@/lib/procedures';
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
  clienteId: z.number().default(1), // Cliente por defecto = 1
  subtotal: z.number(),
  total: z.number(),
  totalComision: z.number(),
  detalles: z.array(orderDetailSchema),
  usuarios: z.array(orderUserSchema)
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Usar la función que reemplaza el procedimiento almacenado get_all_order
    const results = await getAllOrders();
    const orders = Array.isArray(results) ? results : [results];
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error en GET /api/orders:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({ success: false, message: 'Error al obtener pedidos', error: error instanceof Error ? error.message : String(error) });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const parse = orderSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({
        success: false,
        message: 'Datos inválidos',
        errors: parse.error.issues
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

    // Obtener información del cliente y mesero para la notificación
    const clienteResults = await query('SELECT nombre, apellido FROM clientes WHERE id_cliente = ?', [clienteId]) as any[];
    const clienteResult = clienteResults[0];
    const clienteNombre = clienteResult?.nombre || 'Cliente';
    
    const meseroResults = await query('SELECT nombre FROM usuarios WHERE id_usuario = ?', [meseroId]) as any[];
    const meseroResult = meseroResults[0];
    const meseroNombre = meseroResult?.nombre || 'Mesero';
    
  
    
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
    console.info('[ORDERS] sending new_order notification', notificationData);
    sendNotificationToAll('new_order', notificationData);

    return res.status(201).json({
      success: true,
      message: 'Pedido creado correctamente',
      id: pedidoId
    });
  } catch (error) {
    console.error('❌ Error en POST /api/orders:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    try {
      await rawQuery('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error al hacer rollback:', rollbackError);
    }
    return res.status(500).json({ success: false, message: 'Error al crear pedido', error: error instanceof Error ? error.message : String(error) });
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
    console.error('❌ Error en DELETE /api/orders:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    try {
      await rawQuery('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error al hacer rollback:', rollbackError);
    }
    return res.status(500).json({ success: false, message: 'Error al eliminar pedido', error: error instanceof Error ? error.message : String(error) });
  }
};

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
