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
  subtotal: z.number(),
  generaComision: z.number().optional().default(1), // 1 = genera comisión, 0 = no genera comisión
  hostessId: z.number().nullable().optional(), // Anfitriona asignada a este producto (para bebidas individuales)
  selectedHostesses: z.array(z.string()).optional().default([]), // Para champañas con múltiples anfitrionas
  roomId: z.number().nullable().optional(), // Habitación asignada para bebidas > $30,000 con comisión
});

const orderUserSchema = z.object({
  usuarioId: z.number()
});

const orderSchema = z.object({
  codigo: z.string().min(1),
  meseroId: z.number(),
  clienteId: z.number().nullable().optional(), // Permitir NULL
  subtotal: z.number(),
  total: z.number(),
  totalComision: z.number(),
  detalles: z.array(orderDetailSchema),
  usuarios: z.array(orderUserSchema)
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Consulta directa para obtener todos los pedidos con detalles
    const orders = await query(`
      SELECT
        P.id_pedido,
        COALESCE(CONCAT(CL.nombre, ' ', CL.apellido), 'Sin cliente registrado') AS cliente,
        P.codigo,
        CONCAT(U.nombre, ' ', U.apellido) AS garzon,
        (SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ')
         FROM pedidos_usuarios PU
         INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id
         WHERE PU.pedido_id = P.id_pedido) AS nicks,
        P.subtotal,
        P.total,
        P.estado
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      WHERE P.estado = 1
    `, []);
    
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
      [codigo, meseroId, clienteId || null, subtotal, total, totalComision]
    );
    const pedidoId = result.insertId;

    // Insertar detalles
    for (const d of detalles) {
      const detalleResult: any = await query(
        'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal, hostess_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [pedidoId, d.productoId, d.precio, d.comision, d.generaComision ?? 1, d.cantidad, d.subtotal, d.hostessId || null]
      );
      
      // Si el producto tiene anfitrionas específicamente asignadas (champañas), crear registros individuales
      if (d.selectedHostesses && d.selectedHostesses.length > 0) {
        try {
          for (const hostessId of d.selectedHostesses) {
            await query(
              'INSERT INTO detalle_pedidos_anfitrionas (detalle_pedido_id, anfitriona_id) VALUES (?, ?)',
              [detalleResult.insertId, Number(hostessId)]
            );
          }
        } catch (tableError) {
          // Si la tabla no existe, crear la tabla y reintentar
          console.log('Tabla detalle_pedidos_anfitrionas no existe, creándola...');
          await query(`
            CREATE TABLE IF NOT EXISTS detalle_pedidos_anfitrionas (
              id_detalle_anfitriona INT AUTO_INCREMENT PRIMARY KEY,
              detalle_pedido_id INT NOT NULL,
              anfitriona_id INT NOT NULL,
              fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedidos(id_detalle_pedido) ON DELETE CASCADE,
              FOREIGN KEY (anfitriona_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
              UNIQUE KEY unique_detalle_anfitriona (detalle_pedido_id, anfitriona_id)
            )
          `);
          
          // Reintentar inserción
          for (const hostessId of d.selectedHostesses) {
            await query(
              'INSERT INTO detalle_pedidos_anfitrionas (detalle_pedido_id, anfitriona_id) VALUES (?, ?)',
              [detalleResult.insertId, Number(hostessId)]
            );
          }
        }
      }
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
    let clienteNombre = 'Sin cliente registrado';
    if (clienteId) {
      const clienteResults = await query('SELECT nombre, apellido FROM clientes WHERE id_cliente = ?', [clienteId]) as any[];
      const clienteResult = clienteResults[0];
      if (clienteResult) {
        clienteNombre = `${clienteResult.nombre} ${clienteResult.apellido}`;
      }
    }
    
    const meseroResults = await query('SELECT nombre, apellido FROM usuarios WHERE id_usuario = ?', [meseroId]) as any[];
    const meseroResult = meseroResults[0];
    const meseroNombre = meseroResult ? `${meseroResult.nombre} ${meseroResult.apellido || ''}`.trim() : 'Mesero';
    
  
    
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
