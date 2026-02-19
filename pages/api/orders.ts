import type { NextApiRequest, NextApiResponse } from 'next';
import { query, rawQuery } from '@/lib/db';
import { z } from 'zod';
import { sendNotificationToAll } from './notifications/sse';
import { notifyOrderDeleted, notifyOrderCreated } from './orders/sse';

/**
 * Busca si una anfitriona está actualmente en una venta con habitación y temporizador activo
 * @param anfitrionaId ID de la anfitriona
 * @returns Información de la venta activa con habitación, o null si no está en ninguna
 */
async function buscarVentaActivaConHabitacion(anfitrionaId: number): Promise<{
  id_venta: number;
  habitacion_id: number;
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
        AND v.estado = 1
      ORDER BY v.fecha_crea DESC
      LIMIT 1
    `,
      [anfitrionaId]
    )) as any[];

    if (resultado && resultado.length > 0) {
      return resultado[0];
    }
    return null;
  } catch (error) {
    console.error('[ORDERS] Error buscando venta activa con habitación:', error);
    return null;
  }
}

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
  roomId: z.number().nullable().optional() // Habitación asignada para bebidas > $30,000 con comisión
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
  propina: z.number().optional().default(0), // Agregar campo propina
  detalles: z.array(orderDetailSchema),
  usuarios: z.array(orderUserSchema)
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
      usuarios
    } = parse.data;

    // NUEVA LÓGICA: Verificar si hay productos >= 30,000 con anfitrionas
    const tieneProductosEspeciales = detalles.some(d => {
      const precio = d.precio || 0;
      const tieneAnfitrionas =
        (d.selectedHostesses && d.selectedHostesses.length > 0) || d.hostessId;
      return precio >= 30000 && tieneAnfitrionas;
    });

    console.log(
      '[ORDERS POST] ¿Tiene productos >= 30,000 con anfitrionas?',
      tieneProductosEspeciales
    );

    // Solo verificar ventas activas si hay productos especiales
    let habitacionAutoSeleccionada: number | null = null;
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
            `[ORDERS POST] ✅ Anfitriona ${usuario.usuarioId} está en venta activa:`,
            ventaActiva
          );
          habitacionAutoSeleccionada = ventaActiva.habitacion_id;
          tiempoAutoSeleccionado = ventaActiva.tiempo;
          console.log(
            `[ORDERS POST] 🏠 Auto-seleccionando habitación ${ventaActiva.habitacion_nombre} (ID: ${habitacionAutoSeleccionada})`
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
      detalles = detalles.map(detalle => {
        const precio = detalle.precio || 0;
        const tieneAnfitrionas =
          detalle.hostessId || (detalle.selectedHostesses && detalle.selectedHostesses.length > 0);

        // Solo asignar habitación a productos >= 30,000 con anfitrionas
        if (precio >= 30000 && tieneAnfitrionas && !detalle.roomId) {
          console.log(
            `[ORDERS POST] ✅ Asignando habitación ${habitacionAutoSeleccionada} al producto ${detalle.productoId} (precio: ${precio})`
          );
          return {
            ...detalle,
            roomId: habitacionAutoSeleccionada
          };
        }
        return detalle;
      });
      console.log('[ORDERS POST] 📝 Detalles actualizados con habitación auto-seleccionada');
    }

    // Iniciar transacción
    await rawQuery('START TRANSACTION');
    // Insertar pedido principal
    const result: any = await query(
      'INSERT INTO pedidos (codigo, mesero_id, cliente_id, subtotal, total, total_comision, propina) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [codigo, meseroId, clienteId || null, subtotal, total, totalComision, propina || 0]
    );
    const pedidoId = result.insertId;

    // Insertar detalles
    for (const d of detalles) {
      // Verificar si la columna habitacion_id existe, si no, agregarla
      try {
        await query(
          'ALTER TABLE detalle_pedidos ADD COLUMN IF NOT EXISTS habitacion_id INT NULL AFTER hostess_id'
        );
      } catch (alterError) {
        // Si falla, intentar sin IF NOT EXISTS (para MySQL más antiguo)
        try {
          await query(
            'ALTER TABLE detalle_pedidos ADD COLUMN habitacion_id INT NULL AFTER hostess_id'
          );
        } catch (e) {
          // La columna ya existe, continuar
        }
      }

      const detalleResult: any = await query(
        'INSERT INTO detalle_pedidos (pedido_id, producto_id, precio, comision, genera_comision, cantidad, subtotal, hostess_id, habitacion_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          pedidoId,
          d.productoId,
          d.precio,
          d.comision,
          d.generaComision ?? 1,
          d.cantidad,
          d.subtotal,
          d.hostessId || null,
          d.roomId || null
        ]
      );

      console.log(
        `[ORDERS POST] 💾 Detalle insertado - Producto: ${d.productoId}, Habitación: ${d.roomId || 'ninguna'}, Precio: ${d.precio}`
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

    // Si el pedido contiene habitaciones asignadas, marcarlas como ocupadas (NO cambiar estado de anfitrionas)
    try {
      const roomIds = Array.from(
        new Set(
          (detalles || [])
            .map((d: any) => d.roomId)
            .filter((r: any) => r !== null && r !== undefined)
        )
      );

      if (roomIds.length > 0) {
        for (const rid of roomIds) {
          try {
            await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [rid]);
            console.info('[ORDERS POST] Habitación marcada como ocupada (id):', rid);

            // Notificar a clientes conectados que la habitación cambió de estado
            try {
              sendNotificationToAll('room_occupied', {
                roomId: Number(rid),
                timestamp: new Date().toISOString()
              });
            } catch (notifyRoomErr) {
              console.error('[ORDERS POST] Error notificando room_occupied:', notifyRoomErr);
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

    // Obtener información del cliente, mesero y anfitrionas para la notificación
    let clienteNombre = 'Sin cliente registrado';
    if (clienteId) {
      const clienteResults = (await query(
        'SELECT nombre, apellido FROM clientes WHERE id_cliente = ?',
        [clienteId]
      )) as any[];
      const clienteResult = clienteResults[0];
      if (clienteResult) {
        clienteNombre = `${clienteResult.nombre} ${clienteResult.apellido}`;
      }
    }

    const meseroResults = (await query(
      'SELECT nombre, apellido FROM usuarios WHERE id_usuario = ?',
      [meseroId]
    )) as any[];
    const meseroResult = meseroResults[0];
    const meseroNombre = meseroResult
      ? `${meseroResult.nombre} ${meseroResult.apellido || ''}`.trim()
      : 'Mesero';

    // Obtener las anfitrionas asignadas al pedido
    const anfitrionasResults = (await query(
      `
      SELECT GROUP_CONCAT(u.nick SEPARATOR ', ') as anfitrionas
      FROM pedidos_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id_usuario
      WHERE pu.pedido_id = ?
    `,
      [pedidoId]
    )) as any[];

    const anfitrionasNombre = anfitrionasResults[0]?.anfitrionas || null;

    // Enviar notificación en tiempo real
    const notificationData = {
      id: pedidoId,
      codigo,
      cliente: clienteNombre,
      mesero: meseroNombre,
      anfitriona: anfitrionasNombre,
      total: total,
      timestamp: new Date().toISOString(),
      createdBy: meseroId // Añadir el ID del usuario que creó el pedido
    };
    console.log('[ORDERS API POST] 📤 ENVIANDO notificación new_order a todos los clientes SSE:', notificationData);
    sendNotificationToAll('new_order', notificationData);

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
    const pedidoInfo = (await query('SELECT * FROM pedidos WHERE id_pedido = ?', [id])) as any[];

    await rawQuery('START TRANSACTION');
    await query('DELETE FROM detalle_pedidos WHERE pedido_id = ?', [id]);
    await query('DELETE FROM pedidos_usuarios WHERE pedido_id = ?', [id]);
    await query('DELETE FROM pedidos WHERE id_pedido = ?', [id]);
    await rawQuery('COMMIT');

    // Enviar notificación en tiempo real de que el pedido fue eliminado
    if (pedidoInfo && pedidoInfo.length > 0) {
      console.info('[ORDERS] sending order_deleted notification', {
        id: Number(id),
        meseroId: pedidoInfo[0].mesero_id
      });
      sendNotificationToAll('order_deleted', {
        id: Number(id),
        meseroId: pedidoInfo[0].mesero_id,
        timestamp: new Date().toISOString()
      });

      // Notificar a través de SSE para actualizar lista de pedidos
      try {
        notifyOrderDeleted(Number(id));
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
