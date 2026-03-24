/* eslint-disable prefer-const, @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery, generateUUID } from '@/lib/db';
import { formatCurrencyCLP } from '@/lib/formatters';
import { z } from 'zod';
import { sendNotificationToAll } from '@/lib/sseService';
import { notifyOrderDeleted, notifyOrderCreated } from './orders/sse';
import { sendPushByRole } from '@/lib/pushNotifications';
import { buildOrderPushBody } from '@/lib/notificationMessages';
import {
  buildOrderDeletionNotificationData,
  buildOrderNotificationData,
} from '@/lib/orderNotificationUtils';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';
import {
  applyAutoRoomToDetails,
  hasSpecialHostessProducts,
} from '@/lib/orderRoomAssignment';

type VentaActivaRow = {
  id_venta: string;
  habitacion_id: string;
  habitacion_nombre: string;
  tiempo: number;
  codigo: string;
};

type RoomInfoRow = {
  precio: number | string | null;
  comision_anfitriona: number | string | null;
  tiempo: number | string | null;
};

type PedidoInfoRow = {
  mesero_id: string | number;
};

type DetalleConHabitacion = {
  roomId?: string | null;
};

/**
 * Busca si una anfitriona está actualmente en una venta con habitación y temporizador activo
 * @param anfitrionaId ID de la anfitriona
 * @returns Información de la venta activa con habitación, o null si no está en ninguna
 */
async function buscarVentaActivaConHabitacion(anfitrionaId: string): Promise<{
  id_venta: string;
  habitacion_id: string;
  habitacion_nombre: string;
  tiempo: number;
  codigo: string;
} | null> {
  try {
    const resultado = (await query(
      `
      SELECT 
        v.id_venta, 
        v.habitacion_id, 
        h.nombre as habitacion_nombre, 
        v.tiempo, 
        v.codigo
      FROM ventas v
      INNER JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      INNER JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      WHERE vu.usuario_id = ? 
        AND v.habitacion_id IS NOT NULL 
        AND v.tiempo > 0
        AND v.estado = 2
      ORDER BY v.fecha_crea DESC
      LIMIT 1
  `,
      [anfitrionaId]
    )) as VentaActivaRow[];

    if (resultado && resultado.length > 0) {
      return resultado[0];
    }
    return null;
  } catch (error) {
    return null;
  }
}

const url = process.env.CORS_ORIGINS;
// Esquema de validación para crear/actualizar pedidos
const orderDetailSchema = z.object({
  productoId: z.string(),
  precio: z.number(),
  comision: z.number(),
  cantidad: z.number(),
  subtotal: z.number(),
  generaComision: z.number().optional().default(1), // 1 = genera comisión, 0 = no genera comisión
  hostessId: z.string().nullable().optional(), // Anfitriona asignada a este producto (para bebidas individuales)
  selectedHostesses: z.array(z.string()).optional().default([]), // Para champañas con múltiples anfitrionas
  roomId: z.string().nullable().optional() // Habitación asignada para bebidas > $30,000 con comisión
});

const orderUserSchema = z.object({
  usuarioId: z.string()
});

const orderSchema = z.object({
  codigo: z.string().min(1),
  meseroId: z.string(),
  clienteId: z.string().nullable().optional(), // Permitir NULL
  subtotal: z.number(),
  total: z.number(),
  totalComision: z.number(),
  propina: z.number().optional().default(0), // Agregar campo propina
  detalles: z.array(orderDetailSchema),
  usuarios: z.array(orderUserSchema),
  device_date: z.string().optional().nullable() // Fecha opcional del dispositivo
});

const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    console.log('[ORDERS API] 🔍 Obteniendo pedidos pendientes...');

    // Consulta directa para obtener todos los pedidos con detalles
    const orders = await query(
      `
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
        P.estado, 
        P.fecha_crea
      FROM pedidos P
      LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
      LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
      WHERE P.estado = 1
      ORDER BY P.fecha_crea DESC
  `,
      []
    );

    console.log(
      `[ORDERS API] ✅ Se encontraron ${Array.isArray(orders) ? orders.length : 0} pedidos pendientes`
    );

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('❌ Error en GET /api/orders:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    return res.status(500).json({
      success: false,
      message: 'Error al obtener pedidos',
      error: error instanceof Error ? error.message : String(error)
    });
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
    let {
      codigo,
      meseroId,
      clienteId,
      subtotal,
      total,
      totalComision,
      propina,
      detalles,
      usuarios,
      device_date
    } = parse.data;

    // NUEVA LÓGICA: Verificar si hay productos >= 30,000 con anfitrionas
    const tieneProductosEspeciales = hasSpecialHostessProducts(detalles);

    console.log(
      '[ORDERS POST] ¿Tiene productos >= 30,000 con anfitrionas?',
      tieneProductosEspeciales
    );

    // Solo verificar ventas activas si hay productos especiales
    let habitacionAutoSeleccionada: string | null = null;
    let tiempoAutoSeleccionado: number | null = null;

    if (tieneProductosEspeciales && usuarios && usuarios.length > 0) {
      console.log(
        '[ORDERS POST] Verificando si anfitrionas están en ventas activas con habitación...'
      );
      console.log(
        '[ORDERS POST] Anfitrionas del pedido:',
        usuarios.map(u => u.usuarioId)
      );

      for (const usuario of usuarios) {
        console.log(`[ORDERS POST] Buscando venta activa para anfitriona ${usuario.usuarioId}...`);
        const ventaActiva = await buscarVentaActivaConHabitacion(usuario.usuarioId);

        if (ventaActiva) {
          console.log(
            `[ORDERS POST] ✅ Anfitriona ${usuario.usuarioId} está en venta activa: `,
            ventaActiva
          );
          habitacionAutoSeleccionada = ventaActiva.habitacion_id;
          tiempoAutoSeleccionado = ventaActiva.tiempo;
          console.log(
            `[ORDERS POST] 🏠 Auto - seleccionando habitación ${ventaActiva.habitacion_nombre} (ID: ${habitacionAutoSeleccionada})`
          );
          console.log(`[ORDERS POST] ⏱️ Tiempo de venta activa: ${tiempoAutoSeleccionado} minutos`);
          break;
        } else {
          console.log(
            `[ORDERS POST] ℹ️ Anfitriona ${usuario.usuarioId} NO está en venta activa con habitación`
          );
        }
      }

      if (!habitacionAutoSeleccionada) {
        console.log('[ORDERS POST] ℹ️ Ninguna anfitriona está en venta activa con habitación');
      }
    } else if (!tieneProductosEspeciales) {
      console.log(
        '[ORDERS POST] ℹ️ No hay productos >= 30,000 con anfitrionas - No se auto-selecciona habitación'
      );
    } else if (!usuarios || usuarios.length === 0) {
      console.log(
        '[ORDERS POST] ⚠️ No hay anfitrionas en el pedido - No se puede auto-seleccionar habitación'
      );
    }

    // Si se encontró una habitación activa, asignarla a los detalles que tengan anfitrionas y precio >= 30,000
    if (habitacionAutoSeleccionada) {
      console.log(
        '[ORDERS POST] 📝 Asignando habitación a detalles con productos >= 30,000 y anfitrionas...'
      );
      detalles = applyAutoRoomToDetails(detalles, habitacionAutoSeleccionada);
      console.log('[ORDERS POST] 📝 Detalles actualizados con habitación auto-seleccionada');
    }

    // Iniciar transacción
    await rawQuery('START TRANSACTION');
    
    const pedidoId = generateUUID();
    const fechaCrea = getNowInBusinessTimezone(device_date || undefined);
    
    await query(
      'INSERT INTO pedidos (id_pedido, codigo, mesero_id, cliente_id, subtotal, total, total_comision, propina, estado, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [pedidoId, codigo, meseroId, clienteId || null, subtotal, total, totalComision, propina || 0, 1, fechaCrea]
    );

    // Insertar detalles
    for (const d of detalles) {
      // Verificar si la columna habitacion_id existe, si no, agregarla
      try {
        await query(
          'ALTER TABLE detalle_pedidos ADD COLUMN IF NOT EXISTS habitacion_id VARCHAR(36) NULL AFTER hostess_id'
        );
      } catch (alterError) {
        // Si falla, intentar sin IF NOT EXISTS (para MySQL más antiguo)
        try {
          await query(
            'ALTER TABLE detalle_pedidos ADD COLUMN habitacion_id VARCHAR(36) NULL AFTER hostess_id'
          );
        } catch (e) {
          // La columna ya existe o hay otro error, verificar tipo
          try {
             await query('ALTER TABLE detalle_pedidos MODIFY COLUMN habitacion_id VARCHAR(36) NULL');
          } catch(modifyError) {
             // Ignorar si ya está correcto o falla
          }
        }
      }

      const detallePedidoId = generateUUID();
      await query(
        'INSERT INTO detalle_pedidos (id_detalle_pedido, pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal, hostess_id, habitacion_id, fecha_crea) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          detallePedidoId,
          pedidoId,
          d.productoId,
          d.precio,
          d.comision,
          d.generaComision ?? 1,
          d.cantidad,
          d.subtotal,
          d.hostessId || null,
          d.roomId || null,
          fechaCrea
        ]
      );

      console.log(
        `[ORDERS POST] 💾 Detalle insertado - Producto: ${d.productoId}, Habitación: ${d.roomId || 'ninguna'}, Precio: ${d.precio} `
      );

      // Si el producto tiene anfitrionas específicamente asignadas (champañas), crear registros individuales
      if (d.selectedHostesses && d.selectedHostesses.length > 0) {
        try {
          for (const hostessId of d.selectedHostesses) {
            await query(
              'INSERT INTO detalle_pedidos_anfitrionas (id_detalle_anfitriona, detalle_pedido_id, anfitriona_id) VALUES (?, ?, ?)',
              [generateUUID(), detallePedidoId, hostessId]
            );
          }
        } catch (tableError) {
          // Si la tabla no existe, crear la tabla y reintentar
          console.log('Tabla detalle_pedidos_anfitrionas no existe, creándola...');
          await query(`
            CREATE TABLE IF NOT EXISTS detalle_pedidos_anfitrionas (
              id_detalle_anfitriona VARCHAR(36) PRIMARY KEY,
              detalle_pedido_id VARCHAR(36) NOT NULL,
              anfitriona_id VARCHAR(36) NOT NULL,
              fecha_crea TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (detalle_pedido_id) REFERENCES detalle_pedidos(id_detalle_pedido) ON DELETE CASCADE,
              FOREIGN KEY (anfitriona_id) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
              UNIQUE KEY unique_detalle_anfitriona (detalle_pedido_id, anfitriona_id)
            )
          `);

          // Reintentar inserción
          for (const hostessId of d.selectedHostesses) {
            await query(
              'INSERT INTO detalle_pedidos_anfitrionas (id_detalle_anfitriona, detalle_pedido_id, anfitriona_id) VALUES (?, ?, ?)',
              [generateUUID(), detallePedidoId, hostessId]
            );
          }
        }
      }
    }

    // Insertar usuarios
    for (const u of usuarios) {
      await query('INSERT INTO pedidos_usuarios (id_pedido_usuario, usuario_id, pedido_id) VALUES (?, ?, ?)', [
        generateUUID(),
        u.usuarioId,
        pedidoId
      ]);
    }
    await rawQuery('COMMIT');

    // Si el pedido contiene habitaciones asignadas, marcarlas como ocupadas (NO cambiar estado de anfitrionas)
    try {
      const roomIds = Array.from(
        new Set(
          (detalles as DetalleConHabitacion[])
            .map(d => d.roomId)
            .filter((r): r is string => r !== null && r !== undefined)
        )
      );

      if (roomIds.length > 0) {
        for (const rid of roomIds) {
          try {
            const roomInfo = (await query('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [rid])) as RoomInfoRow[];
            let isFreeRoom = false;
            if (roomInfo.length > 0) {
              const room = roomInfo[0];
              isFreeRoom = !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
            }
            if (!isFreeRoom) {
              await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [rid]);
              console.info('[ORDERS POST] Habitación marcada como ocupada (id):', rid);

              // Notificar a clientes conectados que la habitación cambió de estado
              try {
                sendNotificationToAll('room_occupied', {
                  roomId: rid,
                  timestamp: new Date().toISOString()
                });
              } catch (notifyRoomErr) {
                console.error('[ORDERS POST] Error notificando room_occupied:', notifyRoomErr);
              }
            } else {
              console.info('[ORDERS POST] Habitación ignorada por ser área libre (id):', rid);
            }
          } catch (roomUpdateErr) {
            console.error(
              '[ORDERS POST] Error al marcar habitación como ocupada:',
              rid,
              roomUpdateErr
            );
          }
        }
      }
    } catch (roomIdsErr) {
      console.error('[ORDERS POST] Error procesando habitaciones del pedido:', roomIdsErr);
    }

    const notificationData = await buildOrderNotificationData({
      pedidoId,
      codigo,
      clienteId,
      meseroId,
      total,
    });
    console.log(
      '[ORDERS API POST] 📤 ENVIANDO notificación new_order a todos los clientes SSE:',
      notificationData
    );
    sendNotificationToAll('new_order', notificationData);

    // Enviar notificación Push a Cajeros y Administradores
    try {
      const pushBody = buildOrderPushBody({
        codigo,
        clienteNombre: notificationData.cliente,
        total,
      });
      sendPushByRole('cajero', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });
      sendPushByRole('administrador', '¡NUEVO PEDIDO!', pushBody, { type: 'order_created' });
    } catch (pushErr) {
      console.error('[ORDERS API POST] Error enviando notificaciones push:', pushErr);
    }

    // Notificar a través de SSE para actualizar lista de pedidos
    try {
      console.log('[ORDERS API POST] 📨 Llamando notifyOrderCreated para pedido:', pedidoId);
      notifyOrderCreated(pedidoId);
    } catch (sseError) {
      console.error('[ORDERS] Error notificando creación por SSE:', sseError);
    }

    return res.status(201).json({
      success: true,
      message: 'Pedido creado correctamente',
      id: pedidoId,
      habitacion_auto_seleccionada: habitacionAutoSeleccionada,
      tiempo_auto_seleccionado: tiempoAutoSeleccionado
    });
  } catch (error) {
    console.error('❌ Error en POST /api/orders:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    try {
      await rawQuery('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error al hacer rollback:', rollbackError);
    }
    return res.status(500).json({
      success: false,
      message: 'Error al crear pedido',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'Falta el id' });

    // Obtener información del pedido antes de eliminarlo
    const pedidoInfo = (await query('SELECT mesero_id FROM pedidos WHERE id_pedido = ?', [id])) as PedidoInfoRow[];

    await rawQuery('START TRANSACTION');
    await query('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
    await query('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
    await query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
    await rawQuery('COMMIT');

    // Enviar notificación en tiempo real de que el pedido fue eliminado
    if (pedidoInfo && pedidoInfo.length > 0) {
      console.info('[ORDERS] sending order_deleted notification', {
        id: id,
        meseroId: pedidoInfo[0].mesero_id
      });
      sendNotificationToAll(
        'order_deleted',
        buildOrderDeletionNotificationData(id as string, String(pedidoInfo[0].mesero_id))
      );

      // Notificar a través de SSE para actualizar lista de pedidos
      try {
        notifyOrderDeleted(id as string);
      } catch (sseError) {
        console.error('[ORDERS] Error notificando eliminación por SSE:', sseError);
      }
    }

    return res.status(200).json({ success: true, message: 'Pedido eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error en DELETE /api/orders:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    try {
      await rawQuery('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error al hacer rollback:', rollbackError);
    }
    return res.status(500).json({
      success: false,
      message: 'Error al eliminar pedido',
      error: error instanceof Error ? error.message : String(error)
    });
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
