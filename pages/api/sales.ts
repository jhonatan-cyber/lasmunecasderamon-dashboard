/* eslint-disable @typescript-eslint/no-explicit-any, prefer-const, @typescript-eslint/no-unused-vars, no-console */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { sendNotificationToAll } from './notifications/sse';
import { notifyOrderProcessed } from './orders/sse';
import { withTransaction } from '@/lib/transactionUtils';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

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
    )) as any[];

    if (resultado && resultado.length > 0) {
      return resultado[0];
    }
    return null;
  } catch {
    return null;
  }
}

async function checkTablesExist() {
  try {
    const columns = (await query("SHOW COLUMNS FROM ventas LIKE 'push_notified_5m'")) as any[];
    if (columns.length === 0) {
      await query("ALTER TABLE ventas ADD COLUMN push_notified_5m TINYINT DEFAULT 0");
    }
    const columnsEnd = (await query("SHOW COLUMNS FROM ventas LIKE 'push_notified_end'")) as any[];
    if (columnsEnd.length === 0) {
      await query("ALTER TABLE ventas ADD COLUMN push_notified_end TINYINT DEFAULT 0");
    }

    const columnsPaused = (await query("SHOW COLUMNS FROM ventas LIKE 'paused_at'")) as any[];
    if (columnsPaused.length === 0) {
      await query("ALTER TABLE ventas ADD COLUMN paused_at DATETIME DEFAULT NULL");
    }
  } catch (err) {
    console.error("Error migrating ventas table:", err);
  }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  await checkTablesExist();
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
      // Obtener la caja más reciente (abierta o cerrada) para no listar ventas de hace meses por error
      const ultimaCajaSql = `
        SELECT id_caja 
        FROM cajas 
        ORDER BY fecha_apertura DESC 
        LIMIT 1
      `;
      const ultimaCajaResult = (await query(ultimaCajaSql)) as any[];

      if (ultimaCajaResult && ultimaCajaResult.length > 0) {
        const cajaId = ultimaCajaResult[0].id_caja;
        whereClause += ' AND v.caja_id = ?';
        params.push(cajaId);
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
        CONCAT(ca.nombre, ' ', ca.apellido) as cajero_nombre,
        ca.nick as cajero_nick, ca.foto as foto_cajero, ca.nombre as registrador_nombre
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
      LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
      LEFT JOIN usuarios ca ON v.created_by = ca.id_usuario
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      ${whereClause}
      GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.tiempo, v.cliente_id, c.nombre, c.apellido, v.habitacion_id, h.nombre, v.pedido_id, g.nombre, g.apellido, g.nick, ca.nombre, ca.apellido, ca.nick, ca.foto
      ORDER BY v.fecha_crea DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `;

    const salesResult = (await query(salesSql, params)) as any[];
    const totalPages = Math.ceil(total / limitNum);

    const processedSales = await Promise.all(
      salesResult.map(async venta => {
        const usuariosSql = `
          SELECT DISTINCT u.id_usuario, u.nick, u.foto 
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
            dv.sub_total,
            dv.hostess_id,
            u.nick as hostess_nick, u.foto as hostess_foto, p.foto as producto_foto
          FROM detalle_ventas dv
          LEFT JOIN productos p ON dv.producto_id = p.id_producto
          LEFT JOIN usuarios u ON dv.hostess_id = u.id_usuario
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
      SELECT id_caja, fecha_apertura 
      FROM cajas 
      WHERE estado = 1 
      ORDER BY fecha_apertura DESC 
      LIMIT 1
    `;
    const cajaActualResult = (await query(cajaActualSql)) as any[];
    const cajaActual = cajaActualResult[0];

    let whereClause = 'WHERE v.estado IN (1, 2, 3)';
    const params: any[] = [];

    if (cajaActual && cajaActual.id_caja) {
      whereClause += ' AND v.caja_id = ?';
      params.push(cajaActual.id_caja);
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
        SUM(CASE WHEN v.metodo_pago = 'prepago' THEN v.total ELSE 0 END) as total_prepago,
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
    const createdBy = currentUser?.id || "default-user";

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
      tiempo,
      device_date
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

    const now = getNowInBusinessTimezone(device_date || undefined);
    const result = await withTransaction(async (trx: any) => {
      const ventaId = generateUUID();

      // 0. Si el método de pago es prepago, verificar y descontar saldo
      if (metodo_pago === 'prepago') {
        if (!clienteIdFinal) {
          throw new Error('Se requiere seleccionar un cliente registrado para pagar con saldo prepago');
        }

        const clienteData = (await trx('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [clienteIdFinal])) as any[];
        if (clienteData.length === 0) {
          throw new Error('Cliente no encontrado');
        }

        const saldoActual = clienteData[0].saldo || 0;
        if (saldoActual < total) {
          throw new Error(`Saldo insuficiente. Saldo disponible: ${saldoActual.toLocaleString('es-CL')}, Total venta: ${total.toLocaleString('es-CL')}`);
        }

        // Descontar saldo
        await trx('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [total, clienteIdFinal]);

        // Buscar nombres de productos y nicks de anfitrionas para metadatos
        const productoIds = detalles.map((d: any) => d.producto_id);
        const productosRows = productoIds.length > 0 
          ? (await trx(`SELECT id_producto, nombre FROM productos WHERE id_producto IN (${productoIds.map(() => '?').join(',')})`, productoIds)) as any[]
          : [];
        
        const hostessesRows = usuarios && usuarios.length > 0 
          ? (await trx(`SELECT nick FROM usuarios WHERE id_usuario IN (${usuarios.map(() => '?').join(',')})`, usuarios)) as any[]
          : [];

        const metadatos = JSON.stringify({
          productos: detalles.map((d: any) => {
            const p = productosRows.find(row => row.id_producto === d.producto_id);
            return {
              nombre: p?.nombre || 'Producto',
              cantidad: d.cantidad || 1
            };
          }),
          anfitrionas: hostessesRows.map(h => h.nick).filter(Boolean)
        });

        // Registrar movimiento de consumo con metadatos detallados
        await trx(
          `INSERT INTO clientes_prepago_movimientos 
          (id_movimiento, cliente_id, tipo, monto, venta_id, usuario_id, fecha_crea, metadatos) 
          VALUES (?, ?, 'CONSUMO', ?, ?, ?, ?, ?)`,
          [generateUUID(), clienteIdFinal, total, ventaId, createdBy, now, metadatos]
        );
      }
      const insertVentaSql = `
        INSERT INTO ventas (
          id_venta, codigo, cliente_id, pedido_id, habitacion_id, metodo_pago, propina, sub_total, total, total_comision, tiempo, caja_id, created_by, estado, fecha_crea
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await trx(insertVentaSql, [
        ventaId,
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
        estadoVenta,
        now
      ]);

      // 2. Insertar detalles de venta
      for (const detalle of detalles) {
        const detalleVentaId = generateUUID();
        const insertDetalleVentaSql = `
          INSERT INTO detalle_ventas (
            id_detalle_venta, venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const comisionPorUnidad = (detalle.comision || 0) / (detalle.cantidad || 1);
        const subTotalProducto = detalle.sub_total || detalle.precio * detalle.cantidad;

        await trx(insertDetalleVentaSql, [
          detalleVentaId,
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
            INSERT INTO ventas_usuarios (id_usuario_venta, venta_id, usuario_id) VALUES (?, ?, ?)
          `;
          await trx(insertVentaUsuarioSql, [generateUUID(), ventaId, usuarioId]);

          // Ocupar anfitriona si tiene tiempo
          if (tiempo > 0) {
            await trx('UPDATE usuarios SET estado_servicio = 2 WHERE id_usuario = ?', [usuarioId]);
          }
        }
      }

      // 3.5 Ocupar habitación si tiene tiempo y la habitación es de tipo "con servicio"
      if (habitacion_id && tiempo > 0) {
        await trx('UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ? AND (precio > 0 OR tiempo > 0 OR COALESCE(comision_anfitriona, 0) > 0)', [habitacion_id]);
      }

      // 4. Registrar comisiones
      if (totalComision > 0) {
        const comisionesPorAnfitriona = new Map<string, number>();

        for (const detalle of detalles) {
          const comisionTotalDelProducto = Math.round(detalle.comision || 0);
          if (comisionTotalDelProducto <= 0) continue;

          let hostessesParaEsteProducto: string[] = [];

          if (
            detalle.hostesses &&
            Array.isArray(detalle.hostesses) &&
            detalle.hostesses.length > 0
          ) {
            hostessesParaEsteProducto = detalle.hostesses.map((id: any) => String(id));
          } else if (detalle.hostess_id) {
            hostessesParaEsteProducto = [String(detalle.hostess_id)];
          }

          if (hostessesParaEsteProducto.length > 0) {
            const montoBase = Math.floor(comisionTotalDelProducto / hostessesParaEsteProducto.length);
            const residuoComm = comisionTotalDelProducto % hostessesParaEsteProducto.length;

            for (let i = 0; i < hostessesParaEsteProducto.length; i++) {
              const hId = hostessesParaEsteProducto[i];
              const finalMonto = montoBase + (i < residuoComm ? 1 : 0);
              const actual = comisionesPorAnfitriona.get(hId) || 0;
              comisionesPorAnfitriona.set(hId, actual + finalMonto);
            }
          }
        }

        for (const [usuarioId, monto] of comisionesPorAnfitriona.entries()) {
          const totalMonto = Math.round(monto);
          if (totalMonto > 0) {
            const comisionId = generateUUID();
            await trx(
              `INSERT INTO comisiones (
                id_comision,
                venta_id,
                servicio_id,
                monto
              ) VALUES (?, ?, ?, ?)`,
              [comisionId, ventaId, null, totalMonto]
            );

            await trx(
              `INSERT INTO detalle_comisiones (
                id_detalle_comision,
                comision_id,
                usuario_id,
                comision
              ) VALUES (?, ?, ?, ?)`,
              [generateUUID(), comisionId, usuarioId, totalMonto]
            );
          }
        }
      }
      // 5. Registrar propinas (solo para cajeros y garzones)
      if (propina && propina > 0) {
        let staffIds = (await trx(`
          SELECT DISTINCT u.id_usuario
          FROM logins l
          INNER JOIN usuarios u ON u.id_usuario = l.usuario_id
          INNER JOIN roles r ON r.id_rol = u.rol_id
          WHERE l.estado = 1 AND u.estado = 1 AND r.nombre IN ('cajero', 'garzon')
        `)) as any[];

        // Si no hay staff logueado, la propina queda para quien creó la venta como fallback
        if (!staffIds || staffIds.length === 0) {
          staffIds = [{ id_usuario: createdBy }];
        }

        if (staffIds.length > 0) {
          const totalPropina = Math.round(propina);
          const cuotaBase = Math.floor(totalPropina / staffIds.length);
          const residuo = totalPropina % staffIds.length;

          const propinaId = generateUUID();
          await trx(
            'INSERT INTO propinas (id_propina, venta_id, propina) VALUES (?, ?, ?)',
            [propinaId, ventaId, totalPropina]
          );

          for (let i = 0; i < staffIds.length; i++) {
            const montoFinal = cuotaBase + (i < residuo ? 1 : 0);
            if (montoFinal > 0) {
              await trx(
                'INSERT INTO detalle_propinas (id_detalle_propina, propina_id, usuario_id, monto) VALUES (?, ?, ?, ?)',
                [generateUUID(), propinaId, staffIds[i].id_usuario, montoFinal]
              );
            }
          }
        }
      }


      // 6. Actualizar la caja activa
      const cajaActiva = (await trx(
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
          case 'prepago':
            break;
          default:
            montoEfectivo = total;
        }

        await trx(
          `UPDATE cajas SET 
            venta = venta + ?,
            propina = propina + ?,
            efectivo = efectivo + ?,
            tarjeta = tarjeta + ?,
            transferencia = transferencia + ?,
            prepago = prepago + ?,
            comision = comision + ?
          WHERE id_caja = ?`,
          [
            total - (propina || 0),
            propina || 0,
            montoEfectivo,
            montoTarjeta,
            montoTransferencia,
            metodo_pago === 'prepago' ? total : 0,
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
            roomId: habitacion_id,
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
          // Buscar si hay una VENTA activa con cronómetro
          const ventaAnterior = (await query(
            `SELECT id_venta, codigo FROM ventas WHERE habitacion_id = ? AND tiempo > 0 AND estado = 2 AND id_venta != ? ORDER BY fecha_crea DESC LIMIT 1`,
            [habitacion_id, ventaId]
          )) as any[];

          if (ventaAnterior && ventaAnterior.length > 0) {
            const ventaAnteriorId = ventaAnterior[0].id_venta;
            // PAUSAR VENTA ANTERIOR
            await query('UPDATE ventas SET estado = 3, paused_at = NOW(), fecha_mod = NOW() WHERE id_venta = ?', [
              ventaAnteriorId
            ]);

            sendNotificationToAll('timer_paused', {
              servicioId: ventaAnteriorId,
              tipoTransaccion: 'venta'
            });
          }

          // Buscar si hay un SERVICIO activo con cronómetro
          const servicioAnterior = (await query(
            `SELECT id_servicio FROM servicios WHERE habitacion_id = ? AND tiempo > 0 AND estado = 2 ORDER BY fecha_crea DESC LIMIT 1`,
            [habitacion_id]
          )) as any[];

          if (servicioAnterior && servicioAnterior.length > 0) {
            const servicioAnteriorId = servicioAnterior[0].id_servicio;
            // PAUSAR SERVICIO ANTERIOR
            await query('UPDATE servicios SET estado = 3, paused_at = NOW() WHERE id_servicio = ?', [
              servicioAnteriorId
            ]);

            sendNotificationToAll('timer_paused', {
              servicioId: servicioAnteriorId,
              tipoTransaccion: 'servicio'
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
            ? new Date(ventaCompleta.fecha_crea).toISOString()
            : new Date().toISOString()
        });
      } catch (notificacionError) {
        throw notificacionError;
      }
    }

    // Notificar por SSE a todos los clientes conectados
    try {
      await sendNotificationToAll('sale_created', {
        id_venta: ventaId,
        codigo: codigoVenta,
        total: total,
        habitacion_id: habitacion_id,
        habitacion_nombre: ventaCompleta?.habitacion_nombre || null,
        cliente_nombre: ventaCompleta?.cliente_nombre || null,
        estado: estadoVenta,
        created_at: ventaCompleta?.fecha_crea
          ? new Date(ventaCompleta.fecha_crea).toISOString()
          : new Date().toISOString()
      });
      console.log('[SALES] Notificación SSE sale_created enviada');
    } catch (sseError) {
      console.error('[SALES] Error enviando notificación SSE:', sseError);
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


