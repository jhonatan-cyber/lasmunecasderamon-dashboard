import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[SALES GET] Request query:', req.query);
    
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
    console.error('[SALES GET] ❌ Error:', error);
    
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
      console.error('[SALES GET] Error logging to DB:', logError);
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

    // Si se proporciona caja_id específico, usarlo
    // Si no, obtener la caja abierta actual y filtrar por ella
    if (caja_id) {
      whereClause += ' AND v.caja_id = ?';
      params.push(caja_id);
    } else {
      // Obtener la caja abierta actual
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
      } else {
        // Si no hay caja abierta, no mostrar ninguna venta
        whereClause += ' AND v.caja_id IS NULL';
      }
    }

    const countSql = `SELECT COUNT(*) as total FROM ventas v ${whereClause}`;
    const countResult = (await query(countSql, params)) as any[];
    const total = countResult[0]?.total || 0;
    console.log('[SALES GET LISTA] Total ventas:', total);

    console.log('[SALES GET LISTA] Getting sales list...');
    // Usar literales para LIMIT y OFFSET en lugar de placeholders
    const salesSql = `
      SELECT 
        v.id_venta, 
        v.codigo,
        v.total, 
        v.fecha_crea, 
        v.estado, 
        v.metodo_pago, 
        v.propina, 
        v.cliente_id, 
        COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre,
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
        GROUP_CONCAT(u.nick SEPARATOR ', ') as usuarios_nicks
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      LEFT JOIN pedidos p ON v.pedido_id = p.id_pedido
      LEFT JOIN usuarios g ON p.mesero_id = g.id_usuario
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      ${whereClause}
      GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.cliente_id, c.nombre, c.apellido, v.habitacion_id, h.nombre, v.pedido_id, g.nombre, g.apellido, g.nick
      ORDER BY v.fecha_crea DESC 
      LIMIT ${limitNum} OFFSET ${offset}
    `;
    
    console.log('[SALES GET LISTA] Query:', salesSql);
    console.log('[SALES GET LISTA] Params:', params);

    const salesResult = (await query(salesSql, params)) as any[];
    console.log('[SALES GET LISTA] Sales retrieved:', salesResult.length);
    const totalPages = Math.ceil(total / limitNum);

    console.log('[SALES GET LISTA] Processing sales...');
    // Procesar los datos para formatear usuarios como array y obtener detalles
    const processedSales = await Promise.all(
      salesResult.map(async venta => {
        // Obtener usuarios de esta venta
        const usuariosSql = `
          SELECT u.id_usuario, u.nick 
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

        // Obtener detalles de la venta
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
          id: venta.id_venta, // Asegurar que el frontend use 'id'
          usuarios,
          detalles,
          // Mantener compatibilidad con el frontend
          cliente_nombre: venta.cliente_nombre
            ? `${venta.cliente_nombre} ${venta.cliente_apellido || ''}`.trim()
            : 'Sin cliente',
          habitacion_nombre: venta.habitacion_nombre || 'Sin habitación'
        };
      })
    );

    console.log('[SALES GET LISTA] ✅ Sales processed successfully');
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
    console.error('[SALES GET LISTA] ❌ Error:', error);
    
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
      console.error('[SALES GET LISTA] Error logging to DB:', logError);
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

    let whereClause = 'WHERE v.estado = 1';
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
    console.log('[SALES POST] Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      total,
      detalles,
      cliente_id,
      pedido_id,
      metodo_pago = 'efectivo',
      propina = 0,
      usuarios = [],
      habitacion_id,
      sub_total,
      total_comision
    } = req.body;

    if (!total || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      console.error('[SALES POST] Validation failed: missing total or detalles');
      return res.status(400).json({
        success: false,
        message: 'Total y detalles son requeridos'
      });
    }
    
    console.log('[SALES POST] Validation passed, generating code...');

    console.log('[SALES POST] Validation passed, generating code...');

    const generateCode = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const codigoVenta = generateCode();
    console.log('[SALES POST] Generated code:', codigoVenta);

    // Validar si el cliente existe antes de insertar
    let clienteIdFinal = null;
    if (cliente_id) {
      const clienteExistsSql = 'SELECT id_cliente FROM clientes WHERE id_cliente = ? AND estado = 1';
      const clienteExistsResult = (await query(clienteExistsSql, [cliente_id])) as any[];
      
      if (clienteExistsResult && clienteExistsResult.length > 0) {
        clienteIdFinal = cliente_id;
        console.log('[SALES POST] Cliente validado:', clienteIdFinal);
      } else {
        console.warn('[SALES POST] Cliente no existe o está inactivo, se creará venta sin cliente');
      }
    } else {
      console.log('[SALES POST] No se proporcionó cliente_id, se creará venta sin cliente');
    }

    // Obtener la caja abierta actual
    const cajaAbiertaResult = (await query(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];
    const cajaId = cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

    // Calcular el total de comisiones sumando las comisiones de todos los productos
    const totalComision = detalles.reduce((acc, detalle) => {
      const comision = detalle.comision || 0;
      return acc + comision; // La comisión ya viene calculada desde el frontend
    }, 0);
    
    console.log('[SALES POST] Total comision:', totalComision);
    console.log('[SALES POST] Inserting venta into DB...');

    const insertVentaSql = `
      INSERT INTO ventas (
        codigo, cliente_id, pedido_id, habitacion_id, metodo_pago, propina, sub_total, total, total_comision, caja_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const ventaResult = (await query(insertVentaSql, [
      codigoVenta,
      clienteIdFinal, // Usar el cliente validado o null
      pedido_id || null,
      habitacion_id || null,
      metodo_pago,
      propina,
      sub_total || 0,
      total,
      totalComision,
      cajaId
    ])) as any;

    const ventaId = ventaResult.insertId;
    console.log('[SALES POST] Venta inserted with ID:', ventaId);

    // Insertar productos de la venta usando detalle_ventas
    console.log('[SALES POST] Inserting', detalles.length, 'sale details...');
    for (const detalle of detalles) {
      const insertDetalleVentaSql = `
        INSERT INTO detalle_ventas (
          venta_id, producto_id, precio, comision, cantidad, sub_total, hostess_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      // Usar los datos del detalle directamente
      const comisionPorUnidad = (detalle.comision || 0) / (detalle.cantidad || 1); // Calcular comisión por unidad
      const subTotalProducto = detalle.sub_total || detalle.precio * detalle.cantidad;

      await query(insertDetalleVentaSql, [
        ventaId,
        detalle.producto_id,
        detalle.precio,
        comisionPorUnidad, // Guardar comisión por unidad en detalle_ventas
        detalle.cantidad,
        subTotalProducto,
        detalle.hostess_id || null // Anfitriona asignada a este producto
      ]);
    }
    
    console.log('[SALES POST] Sale details inserted successfully');

    // Insertar relaciones venta-usuario
    console.log('[SALES POST] Inserting', usuarios.length, 'user relations...');
    if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
      for (const usuarioId of usuarios) {
        const insertVentaUsuarioSql = `
          INSERT INTO ventas_usuarios (venta_id, usuario_id) VALUES (?, ?)
        `;
        await query(insertVentaUsuarioSql, [ventaId, usuarioId]);
      }
    }
    
    console.log('[SALES POST] User relations inserted');

    // Registrar comisiones para cada anfitriona según asignaciones por producto
    console.log('[SALES POST] Registering commissions...');
    if (totalComision > 0) {
      // Agrupar comisiones por anfitriona
      const comisionesPorAnfitriona = new Map<number, number>();

      // Identificar anfitrionas ya asignadas a productos específicos
      const anfitrionasAsignadas = new Set<number>();
      for (const detalle of detalles) {
        if (detalle.hostess_id) {
          anfitrionasAsignadas.add(detalle.hostess_id);
        }
      }

      // Anfitrionas disponibles para repartir comisiones sin asignación (champaña)
      const anfitrionasDisponibles = usuarios && Array.isArray(usuarios)
        ? usuarios.filter((id: number) => !anfitrionasAsignadas.has(id))
        : [];

      for (const detalle of detalles) {
        const comision = detalle.comision || 0;
        const hostessId = detalle.hostess_id;

        if (comision > 0 && hostessId) {
          // Comisión asignada a anfitriona específica
          const actual = comisionesPorAnfitriona.get(hostessId) || 0;
          comisionesPorAnfitriona.set(hostessId, actual + comision);
        } else if (comision > 0 && !hostessId) {
          // Comisión sin asignación específica (champaña): repartir solo entre anfitrionas NO asignadas
          if (anfitrionasDisponibles.length > 0) {
            const comisionPorAnfitriona = comision / anfitrionasDisponibles.length;
            for (const usuarioId of anfitrionasDisponibles) {
              const actual = comisionesPorAnfitriona.get(usuarioId) || 0;
              comisionesPorAnfitriona.set(usuarioId, actual + comisionPorAnfitriona);
            }
          } else if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
            // Fallback: si todas están asignadas, repartir entre todas
            const comisionPorAnfitriona = comision / usuarios.length;
            for (const usuarioId of usuarios) {
              const actual = comisionesPorAnfitriona.get(usuarioId) || 0;
              comisionesPorAnfitriona.set(usuarioId, actual + comisionPorAnfitriona);
            }
          }
        }
      }

      // Insertar comisiones calculadas
      for (const [usuarioId, monto] of comisionesPorAnfitriona.entries()) {
        if (monto > 0) {
          const comisionResult: any = await query(
            `INSERT INTO comisiones (
              venta_id,
              servicio_id,
              monto
            ) VALUES (?, ?, ?)`,
            [
              ventaId,
              null,
              Math.floor(monto)
            ]
          );

          const comisionId = comisionResult.insertId;

          await query(
            `INSERT INTO detalle_comisiones (
              comision_id,
              usuario_id,
              comision
            ) VALUES (?, ?, ?)`,
            [comisionId, usuarioId, Math.floor(monto)]
          );
        }
      }
    }
    
    console.log('[SALES POST] Commissions registered');

    // Actualizar la caja activa con las ventas y comisiones
    console.log('[SALES POST] Updating active cash register...');
    const cajaActiva = (await query('SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1')) as any[];

    if (cajaActiva && cajaActiva.length > 0) {
      const cajaId = cajaActiva[0].id_caja;

      // Calcular el monto según el método de pago (INCLUYENDO propina)
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
          montoEfectivo = total; // Por defecto efectivo
      }

      // Actualizar la caja con los montos correspondientes (INCLUYENDO propina)
      await query(
        `UPDATE cajas SET 
          venta = venta + ?,
          propina = propina + ?,
          efectivo = efectivo + ?,
          tarjeta = tarjeta + ?,
          transferencia = transferencia + ?,
          comision = comision + ?
        WHERE id_caja = ?`,
        [
          total, // ventas incluyendo propina
          propina || 0, // propina por separado
          montoEfectivo,
          montoTarjeta,
          montoTransferencia,
          totalComision, // comisión total
          cajaId
        ]
      );
      console.log('[SALES POST] Cash register updated');
    } else {
      console.warn('[SALES POST] No active cash register found');
    }

    // Obtener la venta completa con información relacionada
    console.log('[SALES POST] Fetching complete sale info...');
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
    
    console.log('[SALES POST] ✅ Sale created successfully with ID:', ventaId);

    return res.status(201).json({
      success: true,
      message: 'Venta creada exitosamente',
      data: {
        ...ventaCompleta,
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
    console.error('[SALES POST] ❌ Error creating sale:', error);
    console.error('[SALES POST] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
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
      console.error('[SALES POST] Error logging to DB:', logError);
    }
    
    return res.status(500).json({
      success: false,
      message: 'Error al crear venta',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
