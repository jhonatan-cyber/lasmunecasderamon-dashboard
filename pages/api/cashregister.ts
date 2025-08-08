import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { Caja, CajaWithUser, CajaResumen } from '@/types/caja';
import { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';

const createCajaSchema = z.object({
  usuario_id_apertura: z.number().min(1, 'ID de usuario es requerido'),
  monto_apertura: z.number().min(0, 'El monto de apertura debe ser mayor o igual a 0')
});

const updateCajaSchema = z.object({
  ventas: z.number().min(0).optional(),
  efectivo: z.number().min(0).optional(),
  tarjeta: z.number().min(0).optional(),
  transferencia: z.number().min(0).optional(),
  servicios: z.number().min(0).optional(),
  devoluciones: z.number().min(0).optional(),
  iva: z.number().min(0).optional(),
  propina: z.number().min(0).optional(),
  anticipo: z.number().min(0).optional(),
  comision: z.number().min(0).optional()
});

const cierreCajaSchema = z.object({
  id_caja: z.number().min(1, 'ID de caja es requerido'),
  monto_cierre: z.number().min(0, 'El monto de cierre debe ser mayor o igual a 0'),
  usuario_id_cierre: z.number().min(1, 'ID de usuario de cierre es requerido')
});

// Mapeo de caja desde la base de datos
const mapCajaFromDB = (caja: any): Caja => ({
  id_caja: caja.id_caja,
  fecha_apertura: caja.fecha_apertura,
  usuario_id_apertura: caja.usuario_id_apertura,
  monto_apertura: caja.monto_apertura,
  ventas: caja.venta || 0,
  efectivo: caja.efectivo || 0,
  tarjeta: caja.tarjeta || 0,
  transferencia: caja.transferencia || 0,
  servicios: caja.servicio || 0,
  devoluciones: caja.devolucion || 0,
  iva: caja.iva || 0,
  propina: caja.propina || 0,
  anticipo: caja.anticipo || 0,
  comision: caja.comision || 0,
  monto_cierre: caja.monto_cierre,
  usuario_id_cierre: caja.usuario_id_cierre,
  fecha_cierre: caja.fecha_cierre,
  estado: caja.estado
});

// Mapeo de caja con información de usuario
const mapCajaWithUserFromDB = (caja: any): CajaWithUser => ({
  ...mapCajaFromDB(caja),
  cajero_nombre: caja.cajero_nombre,
  cajero_cierre_nombre: caja.cajero_cierre_nombre
});

// Handlers por método HTTP
const handleGet = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id, estado, resumen, status } = req.query;

    // Endpoint para verificar estado de caja (equivalente a caja-status.ts)
    if (status === 'check') {
      const cajaResult = await query(
        "SELECT id_caja, usuario_id_apertura, fecha_apertura FROM cajas WHERE estado = 1 LIMIT 1"
      ) as any[];

      const hasOpenCaja = cajaResult.length > 0;
      const cajaInfo = hasOpenCaja ? cajaResult[0] : null;

      return res.status(200).json({
        success: true,
        data: {
          hasOpenCaja,
          cajaInfo: cajaInfo ? {
            id_caja: cajaInfo.id_caja,
            usuario_id_apertura: cajaInfo.usuario_id_apertura,
            fecha_apertura: cajaInfo.fecha_apertura
          } : null
        }
      });
    }

    if (resumen === '1') {
      // Obtener resumen de cajas
      const resumenResult = await query(`
        SELECT 
          COALESCE(SUM(venta), 0) as total_ventas,
          COALESCE(SUM(efectivo), 0) as total_efectivo,
          COALESCE(SUM(tarjeta), 0) as total_tarjeta,
          COALESCE(SUM(transferencia), 0) as total_transferencia,
          COALESCE(SUM(servicio), 0) as total_servicios,
          COALESCE(SUM(devolucion), 0) as total_devoluciones,
          COALESCE(SUM(iva), 0) as total_iva,
          COALESCE(SUM(propina), 0) as total_propina,
          COALESCE(SUM(anticipo), 0) as total_anticipo,
          COUNT(CASE WHEN estado = 1 THEN 1 END) as cajas_abiertas,
          COUNT(CASE WHEN estado = 0 THEN 1 END) as cajas_cerradas,
          COUNT(CASE WHEN venta > 0 THEN 1 END) as cantidad_ventas,
          COUNT(CASE WHEN servicio > 0 THEN 1 END) as cantidad_servicios,
          CASE 
            WHEN COUNT(CASE WHEN venta > 0 THEN 1 END) > 0 
            THEN COALESCE(SUM(venta), 0) / COUNT(CASE WHEN venta > 0 THEN 1 END)
            ELSE 0 
          END as promedio_venta,
          CASE 
            WHEN COUNT(CASE WHEN servicio > 0 THEN 1 END) > 0 
            THEN COALESCE(SUM(servicio), 0) / COUNT(CASE WHEN servicio > 0 THEN 1 END)
            ELSE 0 
          END as promedio_servicio
        FROM cajas
        WHERE estado IN (0, 1)
      `);

      const resumenData = Array.isArray(resumenResult) ? resumenResult[0] : resumenResult;

      // Calcular balance total
      const balanceTotal = ((resumenData as any).total_efectivo || 0) + 
                          ((resumenData as any).total_tarjeta || 0) + 
                          ((resumenData as any).total_transferencia || 0) - 
                          ((resumenData as any).total_devoluciones || 0);

      // Obtener información de la caja abierta actual
      const cajaAbiertaResult = await query(`
        SELECT 
          fecha_apertura,
          CONCAT(u.nombre, ' ', u.apellido) as usuario_apertura
        FROM cajas c
        LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
        WHERE c.estado = 1
        ORDER BY fecha_apertura DESC
        LIMIT 1
      `) as any[];

      const cajaAbierta = Array.isArray(cajaAbiertaResult) ? cajaAbiertaResult[0] : cajaAbiertaResult;

      const resumenCompleto: CajaResumen = {
        total_ventas: (resumenData as any).total_ventas || 0,
        total_efectivo: (resumenData as any).total_efectivo || 0,
        total_tarjeta: (resumenData as any).total_tarjeta || 0,
        total_transferencia: (resumenData as any).total_transferencia || 0,
        total_servicios: (resumenData as any).total_servicios || 0,
        total_devoluciones: (resumenData as any).total_devoluciones || 0,
        total_iva: (resumenData as any).total_iva || 0,
        total_propina: (resumenData as any).total_propina || 0,
        total_anticipo: (resumenData as any).total_anticipo || 0,
        cajas_abiertas: (resumenData as any).cajas_abiertas || 0,
        cajas_cerradas: (resumenData as any).cajas_cerradas || 0,
        balance_total: balanceTotal,
        cantidad_ventas: (resumenData as any).cantidad_ventas || 0,
        cantidad_servicios: (resumenData as any).cantidad_servicios || 0,
        promedio_venta: (resumenData as any).promedio_venta || 0,
        promedio_servicio: (resumenData as any).promedio_servicio || 0,
        tiempo_abierta: cajaAbierta ? new Date().toISOString() : undefined,
        fecha_apertura: (cajaAbierta as any)?.fecha_apertura,
        usuario_apertura: (cajaAbierta as any)?.usuario_apertura
      };

      return res.status(200).json({
        success: true,
        data: resumenCompleto
      });
    }

    if (id) {
      // Obtener una caja específica por ID
      const cajaId = parseInt(id as string);
      if (isNaN(cajaId)) {
        return res.status(400).json({
          success: false,
          message: 'ID de caja inválido'
        });
      }

      const results = (await query(
        `
          SELECT 
            c.*,
            CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre,
            CONCAT(u2.nombre, ' ', u2.apellido) as cajero_cierre_nombre
          FROM cajas c
          LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
          LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
          WHERE c.id_caja = ?
        `,
        [cajaId]
      )) as RowDataPacket[];

      const cajas = Array.isArray(results) ? results : [results];

      if (cajas.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Caja no encontrada'
        });
      }

      return res.status(200).json({
        success: true,
        data: mapCajaWithUserFromDB(cajas[0])
      });
    } else {
      // Obtener todas las cajas con filtros opcionales
      let whereClause = 'WHERE c.estado IN (0, 1)';
      const params: any[] = [];

      if (estado !== undefined) {
        whereClause += ' AND c.estado = ?';
        params.push(parseInt(estado as string));
      }

      const results = (await query(
        `
          SELECT 
            c.*,
            CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre,
            CONCAT(u2.nombre, ' ', u2.apellido) as cajero_cierre_nombre
          FROM cajas c
          LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
          LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
          ${whereClause}
          ORDER BY c.fecha_apertura DESC
        `,
        params
      )) as RowDataPacket[];

      const cajas = Array.isArray(results) ? results : [results];

      return res.status(200).json({
        success: true,
        data: cajas.map(mapCajaWithUserFromDB)
      });
    }
  } catch (error) {
    console.error('Error en la API de cash register:', error);
    return res.status(500).json({
      success: false,
      message: 'Error al obtener datos de cash register',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Validar datos con Zod
    let validatedData;
    try {
      validatedData = createCajaSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      throw validationError;
    }

    // Verificar si el usuario existe
    const userExists = (await query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
      [validatedData.usuario_id_apertura]
    )) as RowDataPacket[];

    if (!userExists || (Array.isArray(userExists) && userExists.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado o inactivo'
      });
    }

    // Verificar si el usuario ya tiene una caja abierta
    const cajaAbierta = (await query(
      'SELECT id_caja FROM cajas WHERE usuario_id_apertura = ? AND estado = 1',
      [validatedData.usuario_id_apertura]
    )) as RowDataPacket[];

    if (cajaAbierta && Array.isArray(cajaAbierta) && cajaAbierta.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'El usuario ya tiene una caja abierta'
      });
    }

    // Crear la caja
    const result = (await query(
      `INSERT INTO cajas (
        fecha_apertura, 
        usuario_id_apertura, 
        monto_apertura, 
        venta, 
        efectivo, 
        tarjeta, 
        transferencia, 
        servicio, 
        devolucion, 
        iva, 
        propina, 
        anticipo, 
        comision,
        estado
      ) VALUES (NOW(), ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
      [validatedData.usuario_id_apertura, validatedData.monto_apertura]
    )) as RowDataPacket[];

    const insertResult = result as any;
    const cajaId = insertResult.insertId;

    // Obtener la caja creada
    const result2 = (await query(
      `
        SELECT 
          c.*,
          CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre
        FROM cajas c
        LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
        WHERE c.id_caja = ?
      `,
      [cajaId]
    )) as RowDataPacket[];

    const nuevaCaja = Array.isArray(result2) ? result2[0] : result2;

    return res.status(201).json({
      success: true,
      message: 'Caja creada exitosamente',
      data: mapCajaWithUserFromDB(nuevaCaja)
    });
  } catch (error) {
    console.error('Error al crear caja:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { id, ...updateData } = body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID de caja es requerido'
      });
    }

    const cajaId = parseInt(id);
    if (isNaN(cajaId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de caja inválido'
      });
    }

    // Verificar si la caja existe
    const cajaResult = (await query('SELECT id_caja, estado FROM cajas WHERE id_caja = ?', [
      cajaId
    ])) as RowDataPacket[];

    if (!cajaResult || (Array.isArray(cajaResult) && cajaResult.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }

    const caja = Array.isArray(cajaResult) ? cajaResult[0] : cajaResult;

    // Si la caja está cerrada, no permitir actualizaciones
    if (caja.estado === 0) {
      return res.status(400).json({
        success: false,
        message: 'No se puede actualizar una caja cerrada'
      });
    }

    // Validar datos con Zod
    let validatedData;
    try {
      validatedData = updateCajaSchema.parse(updateData);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      throw validationError;
    }

    // Construir la consulta de actualización
    const setClauses: string[] = [];
    const values: any[] = [];

    Object.entries(validatedData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        setClauses.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (setClauses.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No hay datos para actualizar'
      });
    }

    values.push(cajaId);

    const queryStr = `
      UPDATE cajas 
      SET ${setClauses.join(', ')}
      WHERE id_caja = ?
    `;

    await query(queryStr, values);

    // Obtener la caja actualizada
    const [cajaActualizada] = (await query(
      `
        SELECT 
          c.*,
          CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre,
          CONCAT(u2.nombre, ' ', u2.apellido) as cajero_cierre_nombre
        FROM cajas c
        LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
        LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
        WHERE c.id_caja = ?
      `,
      [cajaId]
    )) as RowDataPacket[];

    return res.status(200).json({
      success: true,
      message: 'Caja actualizada exitosamente',
      data: mapCajaWithUserFromDB(cajaActualizada)
    });
  } catch (error) {
    console.error('Error al actualizar caja:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleCierre = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    // Validar datos con Zod
    let validatedData;
    try {
      validatedData = cierreCajaSchema.parse(body);
    } catch (validationError) {
      if (validationError instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: 'Datos de entrada inválidos',
          errors: validationError.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      throw validationError;
    }

    // Verificar si la caja existe y está abierta
    const cajaExists = (await query('SELECT id_caja, estado FROM cajas WHERE id_caja = ?', [
      validatedData.id_caja
    ])) as RowDataPacket[];

    if (!cajaExists || (Array.isArray(cajaExists) && cajaExists.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }

    const caja = Array.isArray(cajaExists) ? cajaExists[0] : cajaExists;

    if (caja.estado === 0) {
      return res.status(400).json({
        success: false,
        message: 'La caja ya está cerrada'
      });
    }

    // Verificar si el usuario de cierre existe
    const userExists = (await query(
      'SELECT id_usuario FROM usuarios WHERE id_usuario = ? AND estado = 1',
      [validatedData.usuario_id_cierre]
    )) as RowDataPacket[];

    if (!userExists || (Array.isArray(userExists) && userExists.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Usuario de cierre no encontrado o inactivo'
      });
    }

    // Cerrar la caja
    (await query(
      `UPDATE cajas 
       SET monto_cierre = ?, 
           usuario_id_cierre = ?, 
           fecha_cierre = NOW(), 
           estado = 0
       WHERE id_caja = ?`,
      [validatedData.monto_cierre, validatedData.usuario_id_cierre, validatedData.id_caja]
    )) as RowDataPacket[];

    // Cerrar todas las sesiones activas cuando se cierra la caja
    await query(
      "UPDATE logins SET estado = 'cerrado', fecha_logout = NOW() WHERE estado = 'activo'"
    );

    // Obtener la caja cerrada
    const [cajaCerrada] = (await query(
      `
        SELECT 
          c.*,
          CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre,
          CONCAT(u2.nombre, ' ', u2.apellido) as cajero_cierre_nombre
        FROM cajas c
        LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
        LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
        WHERE c.id_caja = ?
      `,
      [validatedData.id_caja]
    )) as RowDataPacket[];

    return res.status(200).json({
      success: true,
      message: 'Caja cerrada exitosamente',
      data: mapCajaWithUserFromDB(cajaCerrada)
    });
  } catch (error) {
    console.error('Error al cerrar caja:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: 'ID de caja es requerido'
    });
  }

  const cajaId = parseInt(id as string);
  if (isNaN(cajaId)) {
    return res.status(400).json({
      success: false,
      message: 'ID de caja inválido'
    });
  }

  try {
    // Verificar si la caja existe
    const cajaExists = (await query('SELECT id_caja, estado FROM cajas WHERE id_caja = ?', [
      cajaId
    ])) as RowDataPacket[];

    if (!cajaExists || (Array.isArray(cajaExists) && cajaExists.length === 0)) {
      return res.status(404).json({
        success: false,
        message: 'Caja no encontrada'
      });
    }

    const caja = Array.isArray(cajaExists) ? cajaExists[0] : cajaExists;

    // Si la caja está abierta, no permitir eliminación
    if (caja.estado === 1) {
      return res.status(400).json({
        success: false,
        message: 'No se puede eliminar una caja abierta'
      });
    }

    // Eliminar la caja (cambio de estado a -1 para soft delete)
    await query('UPDATE cajas SET estado = -1 WHERE id_caja = ?', [cajaId]);

    return res.status(200).json({
      success: true,
      message: 'Caja eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error al eliminar caja:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    switch (method) {
      case 'GET':
        return await handleGet(req, res);
      case 'POST':
        return await handlePost(req, res);
      case 'PUT':
        return await handlePut(req, res);
      case 'DELETE':
        return await handleDelete(req, res);
      case 'PATCH':
        return await handleCierre(req, res);
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']);
        return res.status(405).json({
          success: false,
          message: `Método ${method} no permitido`
        });
    }
  } catch (error: any) {
    console.error('Error en la API de cash register:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 