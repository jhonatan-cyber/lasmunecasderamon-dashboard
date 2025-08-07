import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';


/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: Obtener lista de ventas o resumen
 *     tags: [Ventas]
 *     parameters:
 *       - in: query
 *         name: tipo
 *         schema:
 *           type: string
 *           enum: [lista, resumen]
 *         description: Tipo de consulta (lista o resumen)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Número de página para paginación
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Límite de registros por página
 *       - in: query
 *         name: estado
 *         schema:
 *           type: integer
 *         description: Estado de las ventas
 *       - in: query
 *         name: fecha_inicio
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de inicio para filtro
 *       - in: query
 *         name: fecha_fin
 *         schema:
 *           type: string
 *           format: date
 *         description: Fecha de fin para filtro
 *       - in: query
 *         name: usuario_id
 *         schema:
 *           type: integer
 *         description: ID del usuario para filtrar
 *       - in: query
 *         name: cliente_id
 *         schema:
 *           type: integer
 *         description: ID del cliente para filtrar
 *     responses:
 *       200:
 *         description: Lista de ventas o resumen obtenido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Venta'
 *       500:
 *         description: Error interno del servidor
 *   post:
 *     summary: Crear una nueva venta
 *     tags: [Ventas]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - total
 *               - productos
 *             properties:
 *               total:
 *                 type: number
 *                 description: Total de la venta
 *               productos:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id_producto:
 *                       type: integer
 *                     cantidad:
 *                       type: integer
 *                     precio_unitario:
 *                       type: number
 *               cliente_id:
 *                 type: integer
 *                 description: ID del cliente
 *               metodo_pago:
 *                 type: string
 *                 enum: [efectivo, tarjeta, transferencia]
 *                 default: efectivo
 *               propina:
 *                 type: number
 *                 default: 0
 *               usuarios:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array de IDs de usuarios asociados a la venta
 *     responses:
 *       201:
 *         description: Venta creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Venta'
 *       400:
 *         description: Datos de entrada inválidos
 *       409:
 *         description: No hay caja abierta
 *       500:
 *         description: Error interno del servidor
 */
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
    console.error('Error en GET /api/sales:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handleGetLista(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { page = '1', limit = '10', estado } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (estado) {
      whereClause += ' AND v.estado = ?';
      params.push(estado);
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
        v.cliente_id, 
        c.nombre as cliente_nombre, 
        c.apellido as cliente_apellido,
        h.nombre as habitacion_nombre,
        GROUP_CONCAT(u.nick SEPARATOR ', ') as usuarios_nicks
      FROM ventas v 
      LEFT JOIN clientes c ON v.cliente_id = c.id_cliente 
      LEFT JOIN habitaciones h ON v.habitacion_id = h.id_habitacion
      LEFT JOIN ventas_usuarios vu ON v.id_venta = vu.venta_id
      LEFT JOIN usuarios u ON vu.usuario_id = u.id_usuario 
      ${whereClause}
      GROUP BY v.id_venta, v.codigo, v.total, v.fecha_crea, v.estado, v.metodo_pago, v.propina, v.cliente_id, c.nombre, c.apellido, h.nombre
      ORDER BY v.fecha_crea DESC 
      LIMIT ? OFFSET ?
    `;

    const salesResult = (await query(salesSql, [...params, limitNum, offset])) as any[];
    const totalPages = Math.ceil(total / limitNum);

    // Procesar los datos para formatear usuarios como array y obtener detalles
    const processedSales = await Promise.all(salesResult.map(async (venta) => {
      // Convertir usuarios_nicks de string a array
      const usuariosNicks = venta.usuarios_nicks ? venta.usuarios_nicks.split(', ') : [];
      
      // Crear array de usuarios
      const usuarios = usuariosNicks.map((nick: string) => ({
        nick,
        usuario_nombre: nick
      }));

      // Obtener detalles de la venta
      const detallesSql = `
        SELECT 
          dv.*,
          p.nombre as producto_nombre,
          p.precio as producto_precio
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
        cliente_nombre: venta.cliente_nombre ? `${venta.cliente_nombre} ${venta.cliente_apellido || ''}`.trim() : 'Sin cliente',
        habitacion_numero: venta.habitacion_nombre || 'Sin habitación'
      };
    }));

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
    console.error('Error al obtener lista de ventas:', error);
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
    console.error('Error al obtener resumen de ventas:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener resumen de ventas',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('🔍 POST /api/sales - Datos recibidos:', req.body);

    const {
      total,
      detalles,
      cliente_id,
      metodo_pago = 'efectivo',
      propina = 0,
      usuarios = [],
      habitacion_id,
      sub_total,
      total_comision
    } = req.body;

    console.log('🔍 Datos extraídos:', {
      total,
      detalles,
      cliente_id,
      metodo_pago,
      propina,
      usuarios,
      habitacion_id,
      sub_total,
      total_comision
    });

    if (!total || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
      console.log('🔍 Error de validación:', {
        total: !!total,
        detalles: !!detalles,
        isArray: Array.isArray(detalles),
        length: detalles?.length
      });
      return res.status(400).json({
        success: false,
        message: 'Total y detalles son requeridos'
      });
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

    // Calcular el total de comisiones sumando las comisiones de todos los productos
    const totalComision = detalles.reduce((acc, detalle) => {
      const comision = detalle.comision || 0;
      return acc + comision; // La comisión ya viene calculada desde el frontend
    }, 0);

    console.log('🔍 Total de comisiones calculado:', totalComision);

    const insertVentaSql = `
      INSERT INTO ventas (
        codigo, cliente_id,habitacion_id, metodo_pago, propina, sub_total,total,total_comision
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const ventaResult = (await query(insertVentaSql, [
      codigoVenta,
      cliente_id || null,
      habitacion_id || null,
      metodo_pago,
      propina,
      sub_total || 0,
      total,
      totalComision
    ])) as any;

    const ventaId = ventaResult.insertId;

    // Insertar productos de la venta usando detalle_ventas
    for (const detalle of detalles) {
      const insertDetalleVentaSql = `
        INSERT INTO detalle_ventas (
          venta_id, producto_id, precio, comision, cantidad, sub_total
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;

      // Usar los datos del detalle directamente
      const comisionPorUnidad = (detalle.comision || 0) / (detalle.cantidad || 1); // Calcular comisión por unidad
      const subTotalProducto = detalle.sub_total || (detalle.precio * detalle.cantidad);

      await query(insertDetalleVentaSql, [
        ventaId,
        detalle.producto_id,
        detalle.precio,
        comisionPorUnidad, // Guardar comisión por unidad en detalle_ventas
        detalle.cantidad,
        subTotalProducto
      ]);
    }

    // Insertar relaciones venta-usuario
    if (usuarios && Array.isArray(usuarios) && usuarios.length > 0) {
      for (const usuarioId of usuarios) {
        const insertVentaUsuarioSql = `
          INSERT INTO ventas_usuarios (venta_id, usuario_id) VALUES (?, ?)
        `;
        await query(insertVentaUsuarioSql, [ventaId, usuarioId]);
      }
    } 

    // Registrar comisiones para cada anfitriona
    if (usuarios && Array.isArray(usuarios) && usuarios.length > 0 && totalComision > 0) {
      // Calcular comisión por anfitriona (dividir el total de comisiones entre las anfitrionas)
      const comisionPorAnfitriona = Math.floor(totalComision / usuarios.length);
      
      for (const usuarioId of usuarios) {
        // Crear comisión para cada anfitriona
        const comisionResult: any = await query(
          `INSERT INTO comisiones (
            venta_id,
            servicio_id,
            monto
          ) VALUES (?, ?, ?)`,
          [
            ventaId, // venta_id para ventas
            null, // servicio_id es null para ventas
            comisionPorAnfitriona
          ]
        );

        const comisionId = comisionResult.insertId;

        // Insertar detalle de comisión
        await query(
          `INSERT INTO detalle_comisiones (
            comision_id,
            usuario_id,
            comision
          ) VALUES (?, ?, ?)`,
          [
            comisionId,
            usuarioId,
            comisionPorAnfitriona
          ]
        );
      }
    }

    // Actualizar la caja activa con las comisiones
    if (totalComision > 0) {
      const cajaActiva = await query(
        "SELECT id_caja FROM cajas WHERE estado = 1 LIMIT 1"
      ) as any[];

      if (cajaActiva && cajaActiva.length > 0) {
        const cajaId = cajaActiva[0].id_caja;
        
        // Calcular el monto según el método de pago
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

        // Actualizar la caja con los montos correspondientes
        await query(
          `UPDATE cajas SET 
            venta = venta + ?,
            efectivo = efectivo + ?,
            tarjeta = tarjeta + ?,
            transferencia = transferencia + ?,
            comision = comision + ?
          WHERE id_caja = ?`,
          [
            total, // ventas
            montoEfectivo,
            montoTarjeta,
            montoTransferencia,
            totalComision, // comisión total
            cajaId
          ]
        );
      }
    }

    // Obtener la venta completa con información relacionada
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



    return res.status(201).json({
      success: true,
      message: 'Venta creada exitosamente',
      data: {
        ...ventaCompleta,
        comisiones_creadas: usuarios && usuarios.length > 0 && totalComision > 0 ? usuarios.length : 0,
        comision_por_anfitriona: usuarios && usuarios.length > 0 && totalComision > 0 ? Math.floor(totalComision / usuarios.length) : 0,
        total_comision: totalComision
      }
    });
  } catch (error) {
    console.error('Error al crear venta:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al crear venta',
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
