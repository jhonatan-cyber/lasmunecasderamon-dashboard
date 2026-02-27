import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { sendNotificationToAll } from './notifications/sse';
import { notifyOrderProcessed } from './orders/sse';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

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
        AND v.estado = 2
      ORDER BY v.fecha_crea DESC
      LIMIT 1
    `,
      [anfitrionaId]
    )) as any[];

    if (resultado && resultado.length > 0) {
      return resultado[0];
    }
    return null;
  } catch {
    return null;
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return await handleGet(req, res);
    case 'POST':
      return await handlePost(req, res);
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({
        success: false,
        message: 'Método no permitido'
      });
  }
}

export default withAuth(handler);

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const {
      tipo = 'lista',
      page = '1',
      limit = '10',
      estado,
      fecha_inicio,
      fecha_fin,
      usuario_id,
      cliente_id
    } = req.query;

    if (tipo === 'resumen') {
      return await handleGetResumen(req, res);
    } else {
      return await handleGetLista(req, res);
    }
  } catch (error) {
    // Guardar error en base de datos
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS error_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          endpoint VARCHAR(255),
          error_message TEXT,
          stack_trace TEXT,
          request_body TEXT,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'INSERT INTO error_logs (endpoint, error_message, stack_trace, request_body) VALUES (?, ?, ?, ?)',
        [
          '/api/sales GET',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : 'No stack trace',
          JSON.stringify(req.query)
        ]
      );
    } catch (logError) {
      throw logError;
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleGetLista(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { page = '1', limit = '10', estado, caja_id } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (estado) {
      whereClause += ' AND v.estado = ?';
      params.push(estado);
    }

    if (caja_id) {
      whereClause += ' AND v.caja_id = ?';
      params.push(caja_id);
    } else {
      // Intentar obtener la caja abierta actual
      const cajaAbiertaSql = `
        SELECT id_caja 
        FROM cajas 
        WHERE estado = 1 
        ORDER BY fecha_apertura DESC 
        LIMIT 1
      `;
      const cajaAbiertaResult = (await query(cajaAbiertaSql)) as any[];

      if (cajaAbiertaResult && cajaAbiertaResult.length > 0) {
        const cajaAbiertaId = cajaAbiertaResult[0].id_caja;
        whereClause += ' AND v.caja_id = ?';
        params.push(cajaAbiertaId);
      }
    }

    const countSql = `SELECT COUNT(*) as total FROM ventas v ${whereClause}`;
    const countResult = (await query(countSql, params)) as any[];
    const total = countResult[0]?.total || 0;

    const salesSql = `
      SELECT 
        v.id_venta, 
        v.codigo,
        v.total, 
        v.fecha_crea, 
        v.estado, 
        v.metodo_pago, 
        v.propina, 
        v.tiempo,
        v.cliente_id, 
        CASE 
          WHEN v.cliente_id IS NULL THEN 'Sin cliente registrado'
          ELSE COALESCE(CONCAT(c.nombre, ' ', c.apellido), '')
        END as cliente_nombre,
        c.apellido as cliente_apellido,
        v.habitacion_id,
        h.nombre as habitacion_nombre,
        v.pedido_id,
        CASE 
          WHEN v.pedido_id IS NOT NULL THEN CONCAT(g.nombre, ' ', g.apellido)
          ELSE NULL
        END as garzon_nombre,
        CASE 
          WHEN v.pedido_id IS NOT NULL THEN g.nick
          ELSE NULL
        END as garzon_nick,
        GROUP_CONCAT(DISTINCT u.nick SEPARATOR ', ') as usuarios_nicks,
        GROUP_CONCAT(DISTINCT CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ') as usuario_nombre,
        (
          SELECT COALESCE(SUM(dc.comision), 0) 
          FROM comisiones com2
          LEFT JOIN detalle_comisiones dc ON dc.comision_id = com2.id_comision
          WHERE com2.venta_id = v.id_venta
        ) as comision,
        CASE 
          WHEN (
            SELECT COALESCE(SUM(dc.comision), 0) 
            FROM comisiones com2
            LEFT JOIN detalle_comisiones dc ON dc.comision_id = com2.id_comision
            WHERE com2.venta_id = v.id_venta
          ) > 0 THEN 1
          ELSE 0
        END as tiene_comision,
        (
          SELECT u_cajero.nick 
          FROM usuarios u_cajero 
          WHERE u_cajero.id_usuario = v.created_by
        ) as cajero_nick
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
      LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      ${whereClause}
      GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.tiempo, v.cliente_id, c.nombre, c.apellido, v.habitacion_id, h.nombre, v.pedido_id, g.nombre, g.apellido, g.nick
      ORDER BY v.fecha_crea DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const salesResult = (await query(salesSql, params)) as any[];
    const totalPages = Math.ceil(total / limitNum);

    const processedSales = await Promise.all(
      salesResult.map(async venta => {
        const usuariosSql = `
          SELECT DISTINCT u.id_usuario, u.nick 
          FROM ventas_usuarios vu 
          JOIN usuarios u ON vu.usuario_id = u.id_usuario 
          WHERE vu.venta_id = ?
        `;
        const usuariosResult = (await query(usuariosSql, [venta.id_venta])) as any[];
        const usuarios = usuariosResult.map(u => ({
          id: u.id_usuario,
          nick: u.nick,
          usuario_nombre: u.nick
        }));

        const detallesSql = `
          SELECT 
            dv.id_detalle_venta,
            dv.producto_id,
            p.nombre as producto_nombre,
            dv.cantidad,
            dv.precio,
            dv.comision,
            dv.sub_total
          FROM detalle_ventas dv
          LEFT JOIN productos p ON dv.producto_id = p.id_producto
          WHERE dv.venta_id = ?
        `;
        const detalles = await query(detallesSql, [venta.id_venta]);

        return {
          ...venta,
          id: venta.id_venta,
          usuarios,
          detalles,
          cliente_nombre: venta.cliente_nombre || 'Sin cliente',
          habitacion_nombre: venta.habitacion_nombre || 'Sin habitación'
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: processedSales,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: totalPages
      }
    });
  } catch (error) {
    // Guardar error en base de datos
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS error_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          endpoint VARCHAR(255),
          error_message TEXT,
          stack_trace TEXT,
          request_body TEXT,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'INSERT INTO error_logs (endpoint, error_message, stack_trace, request_body) VALUES (?, ?, ?, ?)',
        [
          '/api/sales GET LISTA',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : 'No stack trace',
          JSON.stringify(req.query)
        ]
      );
    } catch (logError) {
      throw logError;
    }

    return res.status(500).json({
      success: false,
      message: 'Error al obtener ventas',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleGetResumen(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { fecha_inicio, fecha_fin, usuario_id, cliente_id } = req.query;

    const cajaActualSql = `
      SELECT fecha_apertura 
      FROM cajas 
      WHERE estado = 1 
      ORDER BY fecha_apertura DESC 
      LIMIT 1
    `;
    const cajaActualResult = (await query(cajaActualSql)) as any[];
    const cajaActual = cajaActualResult[0];

    let whereClause = 'WHERE v.estado IN (1, 2, 3)';
    const params: any[] = [];

    if (cajaActual && cajaActual.fecha_apertura) {
      whereClause += ' AND v.fecha_crea >= ?';
      params.push(cajaActual.fecha_apertura);
    } else if (fecha_inicio) {
      whereClause += ' AND DATE(v.fecha_crea) >= ?';
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      whereClause += ' AND DATE(v.fecha_crea) <= ?';
      params.push(fecha_fin);
    }

    if (cliente_id) {
      whereClause += ' AND v.cliente_id = ?';
      params.push(cliente_id);
    }

    if (usuario_id) {
      whereClause += ` AND EXISTS (
        SELECT 1 FROM ventas_usuarios vu 
        WHERE vu.venta_id = v.id_venta 
        AND vu.usuario_id = ?
      )`;
      params.push(usuario_id);
    }

    const resumenSql = `
      SELECT 
        COUNT(*) as total_ventas,
        SUM(v.total) as total_ventas_monto,
        SUM(CASE WHEN v.metodo_pago = 'efectivo' THEN v.total ELSE 0 END) as total_efectivo,
        SUM(CASE WHEN v.metodo_pago = 'tarjeta' THEN v.total ELSE 0 END) as total_tarjeta,
        SUM(CASE WHEN v.metodo_pago = 'transferencia' THEN v.total ELSE 0 END) as total_transferencia,
        SUM(v.propina) as total_propinas,
        AVG(v.total) as promedio_venta
      FROM ventas v 
      ${whereClause}
    `;

    const resumenResult = (await query(resumenSql, params)) as any[];
    const resumen = resumenResult[0];

    const resumenMetodosSql = `
      SELECT 
        metodo_pago, 
        COUNT(*) as cantidad, 
        SUM(total) as total_monto 
      FROM ventas v 
      ${whereClause}
      GROUP BY metodo_pago
    `;

    const resumenMetodosResult = (await query(resumenMetodosSql, params)) as any[];

    return res.status(200).json({
      success: true,
      data: {
        resumen_general: resumen,
        resumen_metodos_pago: resumenMetodosResult,
        caja_actual: cajaActual
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de ventas',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const currentUser = getCurrentUser(req);
    const createdBy = currentUser?.id || 1;

    let {
      total,
      detalles,
      cliente_id,
      pedido_id,
      metodo_pago = 'efectivo',
      propina = 0,
      usuarios = [],
      habitacion_id,
      sub_total,
      total_comision,
      tiempo
    } = req.body;

    if (!total || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Total y detalles son requeridos'
      });
    }

    const tieneProductosEspeciales = detalles.some(d => {
      const precio = d.precio || 0;
      const tieneAnfitrionas = (d.hostesses && d.hostesses.length > 0) || d.hostess_id;
      return precio >= 30000 && tieneAnfitrionas;
    });

    if (tieneProductosEspeciales && usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
      for (const usuarioId of usuarios) {
        const ventaActiva = await buscarVentaActivaConHabitacion(usuarioId);

        if (ventaActiva) {
          if (!habitacion_id) {
            habitacion_id = ventaActiva.habitacion_id;
          }
          if (!tiempo || tiempo === 0) {
            tiempo = ventaActiva.tiempo;
          }
          break;
        }
      }
    }

    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const codigoVenta = generateCode();

    let clienteIdFinal = null;
    if (cliente_id) {
      const clienteExistsSql =
        'SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 1';
      const clienteExistsResult = (await query(clienteExistsSql, [cliente_id])) as any[];

      if (clienteExistsResult && clienteExistsResult.length > 0) {
        clienteIdFinal = cliente_id;
      }
    }

    const cajaAbiertaResult = (await query(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];
    const cajaId =
      cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

    const totalComision = detalles.reduce((acc, detalle) => {
      const comision = detalle.comision || 0;
      return acc + comision;
    }, 0);

    const estadoVenta = habitacion_id && tiempo && tiempo > 0 ? 2 : 1;

    const result = await withTransaction(async connection => {
      // 1. Insertar la venta
      const insertVentaSql = `
        INSERT INTO ventas (
          codigo, cliente_id, pedido_id, habitacion_id, metodo_pago, propina, sub_total, total, total_comision, tiempo, caja_id, created_by, estado
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const ventaResult = (await connection(insertVentaSql, [
        codigoVenta,
        clienteIdFinal,
        pedido_id || null,
        habitacion_id || null,
        metodo_pago,
        propina,
        sub_total || 0,
        total,
        totalComision,
        tiempo || 0,
        cajaId,
        createdBy,
        estadoVenta
      ])) as any;

      const ventaId = ventaResult.insertId;

      // 2. Insertar detalles de venta
      for (const detalle of detalles) {
        const insertDetalleVentaSql = `
          INSERT INTO detalle_ventas (
            venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const comisionPorUnidad = (detalle.comision || 0) / (detalle.cantidad || 1);
        const subTotalProducto = detalle.sub_total || detalle.precio * detalle.cantidad;

        await connection(insertDetalleVentaSql, [
          ventaId,
          detalle.producto_id,
          detalle.precio,
          comisionPorUnidad,
          detalle.cantidad,
          subTotalProducto,
          detalle.hostesses && Array.isArray(detalle.hostesses) && detalle.hostesses.length > 1
            ? null
            : detalle.hostess_id || null
        ]);
      }

      // 3. Insertar vinculación con usuarios (anfitrionas)
      if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
        for (const usuarioId of usuarios) {
          const insertVentaUsuarioSql = `
            INSERT INTO ventas_usuarios (venta_id, usuario_id) VALUES (?, ?)
          `;
          await connection(insertVentaUsuarioSql, [ventaId, usuarioId]);
        }
      }

      // 4. Registrar comisiones
      if (totalComision > 0) {
        const comisionesPorAnfitriona = new Map<number, number>();

        for (const detalle of detalles) {
          const comision = detalle.comision || 0;
          if (comision <= 0) continue;

          let hostessesParaEsteProducto: number[] = [];

          if (
            detalle.hostesses &&
            Array.isArray(detalle.hostesses) &&
            detalle.hostesses.length > 0
          ) {
            hostessesParaEsteProducto = detalle.hostesses.map((id: any) => parseInt(id));
          } else if (detalle.hostess_id) {
            hostessesParaEsteProducto = [parseInt(detalle.hostess_id)];
          }

          if (hostessesParaEsteProducto.length > 0) {
            const montoPorAnfitriona = Math.round(comision / hostessesParaEsteProducto.length);
            for (const hId of hostessesParaEsteProducto) {
              const actual = comisionesPorAnfitriona.get(hId) || 0;
              comisionesPorAnfitriona.set(hId, actual + montoPorAnfitriona);
            }
          }
        }

        for (const [usuarioId, monto] of comisionesPorAnfitriona.entries()) {
          if (monto > 0) {
            const comisionResult: any = await connection(
              `INSERT INTO comisiones (
                venta_id,
                servicio_id,
                monto
              ) VALUES (?, ?, ?)`,
              [ventaId, 0, monto]
            );

            const comisionId = comisionResult.insertId;

            await connection(
              `INSERT INTO detalle_comisiones (
                comision_id,
                usuario_id,
                comision
              ) VALUES (?, ?, ?)`,
              [comisionId, usuarioId, monto]
            );
          }
        }
      }

      // 5. Actualizar la caja activa
      const cajaActiva = (await connection(
        'SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1'
      )) as any[];

      if (cajaActiva && cajaActiva.length > 0) {
        const cajaId = cajaActiva[0].id_caja;
        let montoEfectivo = 0;
        let montoTarjeta = 0;
        let montoTransferencia = 0;

        switch (metodo_pago) {
          case 'efectivo':
            montoEfectivo = total;
            break;
          case 'tarjeta':
            montoTarjeta = total;
            break;
          case 'transferencia':
            montoTransferencia = total;
            break;
          default:
            montoEfectivo = total;
        }

        await connection(
          `UPDATE cajas SET 
            venta = venta + ?,
            propina = propina + ?,
            efectivo = efectivo + ?,
            tarjeta = tarjeta + ?,
            transferencia = transferencia + ?,
            comision = comision + ?
          WHERE id_caja = ?`,
          [
            total - (propina || 0),
            propina || 0,
            montoEfectivo,
            montoTarjeta,
            montoTransferencia,
            totalComision,
            cajaId
          ]
        );
      }

      return { ventaId };
    });

    const ventaId = result.ventaId;

    const ventaCompletaSql = `
      SELECT 
        v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, 
        v.metodo_pago, v.propina, v.cliente_id,
        c.nombre as cliente_nombre, c.apellido as cliente_apellido,
        GROUP_CONCAT(u.nick SEPARATOR ', ') as usuarios_nicks
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente 
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      WHERE v.id_venta = ?
      GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.cliente_id, c.nombre, c.apellido
    `;

    const ventaCompletaResult = (await query(ventaCompletaSql, [ventaId])) as any[];
    const ventaCompleta = ventaCompletaResult[0];

    if (pedido_id) {
      try {
        notifyOrderProcessed(pedido_id);
      } catch (notificationError) {
        throw notificationError;
      }
    }

    if (habitacion_id && tiempo > 0) {
      try {
        const habitacionInfo = (await query(
          'SELECT nombre FROM habitaciones WHERE id_habitacion = ?',
          [habitacion_id]
        )) as any[];

        const nombreHabitacion =
          habitacionInfo && habitacionInfo.length > 0
            ? habitacionInfo[0].nombre
            : `Habitación ${habitacion_id}`;

        try {
          const roomInfoDb = (await query(
            'SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?',
            [habitacion_id]
          )) as any[];
          let isFreeRoom = false;
          if (roomInfoDb.length > 0) {
            const room = roomInfoDb[0];
            isFreeRoom =
              !Number(room.precio) && !Number(room.comision_anfitriona) && !Number(room.tiempo);
          }
          if (!isFreeRoom) {
            await query('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?', [
              habitacion_id
            ]);
          }
        } catch (roomUpdateErr) {
          throw roomUpdateErr;
        }

        try {
          sendNotificationToAll('room_occupied', {
            roomId: Number(habitacion_id),
            timestamp: new Date().toISOString()
          });
        } catch (roomNotifyErr) {
          throw roomNotifyErr;
        }

        // Verificar si hay un temporizador activo para esta habitación (estado = 2 = en proceso)
        const ventasActivasEnHabitacion = (await query(
          `
          SELECT COUNT(*) as count
          FROM ventas
          WHERE habitacion_id = ?
            AND tiempo > 0
            AND estado = 2
            AND id_venta != ?
        `,
          [habitacion_id, ventaId]
        )) as any[];

        const hayTemporizadorActivo = ventasActivasEnHabitacion[0]?.count > 0;

        if (hayTemporizadorActivo) {
          const ventaAnterior = (await query(
            `
            SELECT id_venta, codigo
            FROM ventas
            WHERE habitacion_id = ?
              AND tiempo > 0
              AND estado = 2
              AND id_venta != ?
            ORDER BY fecha_crea DESC
            LIMIT 1
          `,
            [habitacion_id, ventaId]
          )) as any[];

          if (ventaAnterior && ventaAnterior.length > 0) {
            const ventaAnteriorId = ventaAnterior[0].id_venta;
            const ventaAnteriorCodigo = ventaAnterior[0].codigo;

            await query('UPDATE ventas SET estado = 0, fecha_mod = NOW() WHERE id_venta = ?', [
              ventaAnteriorId
            ]);

            // Liberar anfitrionas de la venta anterior
            const anfitrionasAnteriores = (await query(
              `
              SELECT vu.usuario_id, r.nombre as rol 
              FROM ventas_usuarios vu
              INNER JOIN usuarios u ON vu.usuario_id = u.id_usuario
              LEFT JOIN roles r ON u.rol_id = r.id_rol
              WHERE vu.venta_id = ?
            `,
              [ventaAnteriorId]
            )) as any[];

            if (anfitrionasAnteriores.length > 0) {
              for (const anfitriona of anfitrionasAnteriores) {
                if (anfitriona.rol === 'anfitriona') {
                  await query('UPDATE usuarios SET estado = 1 WHERE id_usuario = ?', [
                    anfitriona.usuario_id
                  ]);
                }
              }
            }

            sendNotificationToAll('timer_stopped', {
              servicioId: ventaAnteriorId,
              roomId: habitacion_id,
              roomName: nombreHabitacion,
              reason: 'Nueva venta en la misma habitación',
              tipoTransaccion: 'venta'
            });
          }
        }

        sendNotificationToAll('timer_started', {
          servicioId: ventaId,
          codigo: codigoVenta,
          roomId: habitacion_id,
          roomName: nombreHabitacion,
          duration: tiempo,
          startTime: ventaCompleta?.fecha_crea
            ? new Date(ventaCompleta.fecha_crea).toISOString()
            : new Date().toISOString(),
          clienteNombre: ventaCompleta?.cliente_nombre
            ? `${ventaCompleta.cliente_nombre} ${ventaCompleta.cliente_apellido}`
            : 'Cliente',
          anfitrionas: ventaCompleta?.usuarios_nicks || '',
          tipoTransaccion: 'venta',
          isRestart: hayTemporizadorActivo,
          ventaId: ventaId,
          total: total,
          subtotal: sub_total || 0,
          precio_servicio: 0,
          precio_habitacion: 0,
          iva: total - (sub_total || total),
          metodo_pago: metodo_pago,
          waiter_name: ventaCompleta?.cajero_nick || 'Cajero',
          created_at: ventaCompleta?.fecha_crea
        });
      } catch (notificacionError) {
        throw notificacionError;
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Venta creada exitosamente',
      data: {
        ...ventaCompleta,
        id: ventaCompleta.id_venta, // Mapear id_venta a id para consistencia con GET
        id_venta: ventaId, // Mantener id_venta también
        comisiones_creadas:
          usuarios && usuarios.length > 0 && totalComision > 0 ? usuarios.length : 0,
        comision_por_anfitriona:
          usuarios && usuarios.length > 0 && totalComision > 0
            ? Math.floor(totalComision / usuarios.length)
            : 0,
        total_comision: totalComision
      }
    });
  } catch (error) {
    // Guardar error en base de datos para debugging
    try {
      await query(`
        CREATE TABLE IF NOT EXISTS error_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          endpoint VARCHAR(255),
          error_message TEXT,
          stack_trace TEXT,
          request_body TEXT,
          fecha_crea DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      await query(
        'INSERT INTO error_logs (endpoint, error_message, stack_trace, request_body) VALUES (?, ?, ?, ?)',
        [
          '/api/sales POST',
          error instanceof Error ? error.message : String(error),
          error instanceof Error ? error.stack : 'No stack trace',
          JSON.stringify(req.body)
        ]
      );
    } catch (logError) {
      throw logError;
    }

    return res.status(500).json({
      success: false,
      message: 'Error al crear venta',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
