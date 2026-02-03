import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withTransaction } from '@/lib/transactionUtils';

import {
  CommissionError,
  CommissionNotFoundError,
  CommissionInactiveError,
  EmployeeNotFoundError,
  EmployeeInactiveError,
  InvalidCommissionStatusError,
  InvalidCommissionAmountError,
  DatabaseError,
  formatErrorResponse,
  validateStatusTransition
} from '@/lib/errors';
import { z } from 'zod';
import { RowDataPacket } from 'mysql2/promise';

// Consulta de estadísticas movida desde commissionQueries
const STATS_QUERY = `
SELECT 
  COALESCE(SUM(CASE 
    WHEN C.venta_id != 0 THEN DC.comision 
    ELSE 0 
  END), 0) AS total_ventas,
  
  COALESCE(SUM(CASE 
    WHEN C.servicio_id != 0 THEN DC.comision 
    ELSE 0 
  END), 0) AS total_servicios,

  COALESCE(SUM(DC.comision), 0) AS total_comisiones,
  COALESCE(AVG(DC.comision), 0) AS promedio_comision,
  COUNT(DISTINCT U.id_usuario) AS cantidad_comisiones,
  COALESCE(MIN(DC.comision), 0) AS comision_minima,
  COALESCE(MAX(DC.comision), 0) AS comision_maxima,
  
  COALESCE(ROUND(
    (SUM(CASE WHEN C.venta_id != 0 THEN DC.comision ELSE 0 END) * 100.0) / 
    NULLIF(SUM(DC.comision), 0)
  ), 0) AS porcentaje_ventas,
  
  COALESCE(ROUND(
    (SUM(CASE WHEN C.servicio_id != 0 THEN DC.comision ELSE 0 END) * 100.0) / 
    NULLIF(SUM(DC.comision), 0)
  ), 0) AS porcentaje_servicios

FROM comisiones C
INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
INNER JOIN usuarios U ON U.id_usuario = DC.usuario_id
WHERE C.fecha_crea >= ? 
  AND C.estado = 1 
  AND DC.comision > 0;
`.trim();

// Interfaces
interface Commission {
  id: string;
  employeeId: string;
  employeeName: string; // anfitriona
  nick: string; // nick
  venta: number; // venta
  servicio: number; // servicio
  total: number; // total (suma de venta + servicio)
  status: 'por_pagar' | 'pagado' | 'anulado';
  // Campos adicionales para compatibilidad con el frontend existente
  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  saleType?: 'producto' | 'servicio' | 'paquete' | 'evento';
  period?: string;
  date?: Date;
  description?: string;
  clientName?: string;
}

interface CommissionWithRowData extends Commission, RowDataPacket {}

// Schemas de validación con Zod
const paginationSchema = z.object({
  page: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform(val => (val ? parseInt(val, 10) : 10)),
  orderBy: z.string().optional(),
  order: z.enum(['ASC', 'DESC']).optional()
});

const filterSchema = z.object({
  employeeId: z.string().optional(),
  status: z.enum(['por_pagar', 'pagado', 'anulado']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  minAmount: z
    .string()
    .optional()
    .transform(val => (val ? parseFloat(val) : undefined)),
  maxAmount: z
    .string()
    .optional()
    .transform(val => (val ? parseFloat(val) : undefined))
});

const createCommissionSchema = z
  .object({
    usuario_id: z.string().min(1, 'ID de anfitriona es requerido'),
    venta_id: z.string().nullable(),
    servicio_id: z.string().nullable(),
    monto: z.number().min(0, 'El monto debe ser mayor o igual a 0')
  })
  .refine(
    data => {
      return data.venta_id !== null || data.servicio_id !== null;
    },
    {
      message: 'Debe especificar al menos una venta o un servicio'
    }
  );

const updateCommissionSchema = z.object({
  id: z.string().min(1, 'ID es requerido'),
  employeeId: z.string().optional(),
  venta: z.preprocess(v => (v ? Number(v) : undefined), z.number().min(0).optional()),
  servicio: z.preprocess(v => (v ? Number(v) : undefined), z.number().min(0).optional()),
  total: z.preprocess(v => (v ? Number(v) : undefined), z.number().min(0).optional()),
  status: z.enum(['pendiente', 'pagado', 'anulado']).optional(),
  description: z.string().optional(),
  clientName: z.string().optional()
});

// Mapeo de comisión desde la base de datos
const mapCommissionFromDB = (row: any): Commission => {
  // Obtener los montos directamente de los campos calculados
  const venta = parseFloat(row.venta || 0);
  const servicio = parseFloat(row.servicio || 0);
  const total = parseFloat(row.total || 0);

  return {
    id: row.id_usuario ? row.id_usuario.toString() : '',
    employeeId: row.id_usuario ? row.id_usuario.toString() : '',
    employeeName: row.anfitriona, // empleado = anfitriona
    nick: row.nick, // nick = nick
    venta: venta, // venta = venta (campo calculado)
    servicio: servicio, // servicio = servicio (campo calculado)
    total: total, // total = total (campo calculado)
    status: row.estado === 1 ? 'por_pagar' : row.estado === 0 ? 'pagado' : 'anulado',

    // Campos adicionales para compatibilidad con el frontend existente
    saleAmount: venta + servicio,
    commissionRate:
      venta + servicio > 0 ? Math.round((total / (venta + servicio)) * 100 * 100) / 100 : 0,
    commissionAmount: total,
    saleType: venta > servicio ? 'producto' : 'servicio',
    period: new Date().toISOString().slice(0, 7),
    date: new Date(),
    description: `Comisión de ${row.anfitriona} - Venta: $${venta}, Servicio: $${servicio}`,
    clientName: undefined
  };
};

// Handlers por método HTTP
export async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, stats } = req.query;
    const commissionId = Array.isArray(id) ? id[0] : id;

    // Si se solicitan las estadísticas
    if (stats === 'true') {
      try {
        const cajaActiva = (await query(`
          SELECT id_caja, fecha_apertura 
          FROM cajas 
          WHERE estado = 1 
          ORDER BY fecha_apertura DESC 
          LIMIT 1
        `)) as RowDataPacket[];

        let fechaApertura;
        if (cajaActiva.length === 0) {
          const fecha30DiasAtras = new Date();
          fecha30DiasAtras.setDate(fecha30DiasAtras.getDate() - 30);
          fechaApertura = fecha30DiasAtras.toISOString().split('T')[0];
        } else {
          fechaApertura = cajaActiva[0].fecha_apertura;
        }

        const statsResult = (await query(STATS_QUERY, [fechaApertura])) as RowDataPacket[];
        const statsData = statsResult[0];

        return res.json({
          total_comisiones: parseFloat(statsData.total_comisiones || 0),
          comision_ventas: parseFloat(statsData.total_ventas || 0),
          comision_servicios: parseFloat(statsData.total_servicios || 0),
          promedio_comision: parseFloat(statsData.promedio_comision || 0),
          cantidad_comisiones: parseInt(statsData.cantidad_comisiones || 0),
          comision_minima: parseFloat(statsData.comision_minima || 0),
          comision_maxima: parseFloat(statsData.comision_maxima || 0),
          porcentaje_ventas: parseInt(statsData.porcentaje_ventas || 0),
          porcentaje_servicios: parseInt(statsData.porcentaje_servicios || 0)
        });
      } catch (error) {
        return res.json({
          total_comisiones: 0,
          comision_ventas: 0,
          comision_servicios: 0,
          promedio_comision: 0,
          cantidad_comisiones: 0,
          comision_minima: 0,
          comision_maxima: 0,
          porcentaje_ventas: 0,
          porcentaje_servicios: 0
        });
      }
    }

    // Obtener parámetros de paginación y filtros
    const { page, limit } = paginationSchema.parse(req.query);
    const { status, employeeId, search } = req.query;
    const offset = (page - 1) * limit;

    // Construir WHERE clause dinámica
    let whereClauses = [];
    let queryParams: any[] = [];

    if (status && status !== 'all') {
      const statusMap: Record<string, number> = {
        por_pagar: 1,
        pagado: 0,
        anulado: 2
      };
      const statusValue = statusMap[status as string];
      if (statusValue !== undefined) {
        whereClauses.push('C.estado = ?');
        queryParams.push(statusValue);
      }
    } else {
      // Por defecto, no mostrar las anuladas (estado 2) a menos que se pida expresamente
      whereClauses.push('C.estado IN (0, 1)');
    }

    if (employeeId && employeeId !== 'all') {
      whereClauses.push('U.id_usuario = ?');
      queryParams.push(employeeId);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchTerm = `%${search.trim()}%`;
      whereClauses.push('(U.nick LIKE ? OR U.nombre LIKE ? OR U.apellido LIKE ?)');
      queryParams.push(searchTerm, searchTerm, searchTerm);
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Consulta que distingue entre comisiones de ventas y servicios
    // Primero obtener el total para paginación
    const countQuery = `
      SELECT COUNT(DISTINCT U.id_usuario) as total
      FROM comisiones C
      INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
      INNER JOIN usuarios U ON U.id_usuario = DC.usuario_id
      ${whereClause}
    `;
    const countResult = (await query(countQuery, queryParams)) as RowDataPacket[];
    const totalRecords = countResult[0].total;

    const simpleQuery = `
      SELECT 
        U.id_usuario,
        U.nick,
        CONCAT(U.nombre, ' ', U.apellido) AS anfitriona,
        COALESCE(SUM(CASE WHEN C.venta_id != 0 THEN DC.comision ELSE 0 END), 0) AS venta,
        COALESCE(SUM(CASE WHEN C.servicio_id != 0 THEN DC.comision ELSE 0 END), 0) AS servicio,
        SUM(DC.comision) AS total,
        C.estado
      FROM comisiones C
      INNER JOIN detalle_comisiones DC ON DC.comision_id = C.id_comision
      INNER JOIN usuarios U ON U.id_usuario = DC.usuario_id
      ${whereClause}
      GROUP BY U.id_usuario, U.nick, U.nombre, U.apellido, C.estado
      ORDER BY anfitriona ASC
      LIMIT ? OFFSET ?
    `;

    const results = (await query(simpleQuery, [...queryParams, limit, offset])) as RowDataPacket[];
    const totalPages = Math.ceil(totalRecords / limit);

    // Mapeo que distingue entre ventas y servicios
    const mappedResults = results.map((row: any) => {
      const venta = parseFloat(row.venta || 0);
      const servicio = parseFloat(row.servicio || 0);
      const total = parseFloat(row.total || 0);

      return {
        id: row.id_usuario ? row.id_usuario.toString() : '',
        employeeId: row.id_usuario ? row.id_usuario.toString() : '',
        employeeName: row.anfitriona,
        nick: row.nick,
        venta: venta,
        servicio: servicio,
        total: total,
        status: row.estado === 1 ? 'por_pagar' : row.estado === 0 ? 'pagado' : 'anulado',
        saleAmount: total,
        commissionRate: 0,
        commissionAmount: total,
        saleType: venta > servicio ? 'producto' : 'servicio',
        period: new Date().toISOString().slice(0, 7),
        date: new Date(),
        description: `Comisión de ${row.anfitriona} - Venta: $${venta}, Servicio: $${servicio}`,
        clientName: undefined
      };
    });

    return res.status(200).json({
      success: true,
      data: mappedResults,
      pagination: {
        page: page,
        limit: limit,
        total: totalRecords,
        totalPages: totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error al obtener las comisiones',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

const handlePost = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    // Validar datos con Zod
    const validatedData = createCommissionSchema.parse(req.body);

    try {
      // Verificar que la anfitriona existe y está activa
      const userResult = (await query(
        'SELECT id_usuario, estado FROM usuarios WHERE id_usuario = ?',
        [validatedData.usuario_id]
      )) as RowDataPacket[];

      if (!Array.isArray(userResult) || userResult.length === 0) {
        throw new EmployeeNotFoundError(validatedData.usuario_id);
      }

      if (userResult[0].estado !== 1) {
        throw new EmployeeInactiveError(validatedData.usuario_id);
      }

      // Validar el monto
      if (validatedData.monto <= 0) {
        throw new InvalidCommissionAmountError(validatedData.monto);
      }

      // Usar el manejador de transacciones
      const result = await withTransaction(async trx => {
        try {
          // 1. Insertar en la tabla comisiones
          const comisionResult: any = await trx(
            `
            INSERT INTO comisiones (
              venta_id,
              servicio_id,
              monto
            ) VALUES (?, ?, ?)
          `,
            [validatedData.venta_id, validatedData.servicio_id, validatedData.monto]
          );

          const comisionId = comisionResult.insertId;

          // 2. Insertar en la tabla detalle_comisiones
          await trx(
            `
            INSERT INTO detalle_comisiones (
              comision_id,
              usuario_id,
              comision
            ) VALUES (?, ?, ?)
          `,
            [comisionId, validatedData.usuario_id, validatedData.monto]
          );

          return {
            id: comisionId,
            ...validatedData
          };
        } catch (dbError) {
          throw new DatabaseError('Error al crear la comisión en la base de datos', dbError);
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Comisión creada exitosamente',
        data: result
      });
    } catch (error) {
      if (error instanceof CommissionError) {
        const response = formatErrorResponse(error);
        return res.status(error.statusCode).json(response);
      }
      throw error; // Propagar otros errores al siguiente catch
    }
  } catch (error) {
    // Manejar errores de validación de Zod
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Datos de entrada inválidos',
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    // Manejar otros errores
    const response = formatErrorResponse(error);
    return res.status(response.error?.code === 'DATABASE_ERROR' ? 500 : 400).json(response);
  }
};

const handlePut = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      throw new CommissionError(
        'ID de comisión es requerido y debe ser un valor único',
        'INVALID_ID',
        400
      );
    }

    try {
      // Validar datos con Zod
      const validatedData = updateCommissionSchema.parse({
        id: id as string,
        ...req.body
      });

      const statusMap: Record<number, string> = {
        0: 'pagado',
        1: 'por_pagar',
        2: 'anulado'
      };

      // Obtener comisión actual
      const currentCommission = (await query(
        'SELECT c.*, dc.estado as detalle_estado FROM comisiones c ' +
          'LEFT JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision ' +
          'WHERE c.id_comision = ?',
        [id]
      )) as RowDataPacket[];

      if (!Array.isArray(currentCommission) || currentCommission.length === 0) {
        throw new CommissionNotFoundError(id);
      }

      const commission = currentCommission[0];

      // Verificar si está eliminada
      if (commission.estado === 0) {
        throw new CommissionInactiveError(id);
      }

      // Validar transición de estado si se está actualizando
      if (validatedData.status) {
        const currentStatus = statusMap[commission.estado as number] || 'desconocido';

        if (!validateStatusTransition(currentStatus, validatedData.status)) {
          throw new InvalidCommissionStatusError(currentStatus, validatedData.status);
        }
      }

      // Construir la consulta de actualización dinámicamente
      const setClauses: string[] = [];
      const values: (string | number)[] = [];

      const fieldMappings: Record<string, string> = {
        employeeId: 'empleado_id',
        venta: 'venta',
        servicio: 'servicio',
        total: 'total',
        status: 'estado',
        description: 'descripcion',
        clientName: 'nombre_cliente'
      };

      // Actualizar usando transacción
      const result = await withTransaction(async trx => {
        try {
          // Construir la actualización dentro de la transacción
          Object.entries(validatedData).forEach(([key, value]) => {
            if (key !== 'id' && value !== undefined && value !== null) {
              const dbField = fieldMappings[key];
              if (dbField) {
                setClauses.push(`${dbField} = ?`);
                if (key === 'status') {
                  const statusMap: Record<string, number> = {
                    por_pagar: 1,
                    pagado: 0,
                    anulado: 2
                  };
                  values.push(statusMap[value as string] || 1);
                } else {
                  values.push(value);
                }
              }
            }
          });

          if (setClauses.length === 0) {
            throw new CommissionError('No hay campos para actualizar', 'NO_UPDATES', 400);
          }

          // Agregar timestamp de modificación
          setClauses.push('fecha_mod = NOW()');

          const updateQuery = `
            UPDATE comisiones 
            SET ${setClauses.join(', ')}
            WHERE id_comision = ?
          `;

          // Agregar el ID al final de los valores
          values.push(id);

          // Ejecutar la actualización
          await trx(updateQuery, values);

          // Si se está cambiando el estado a "pagada", actualizar la tabla detalle_comisiones
          if (validatedData.status === 'pagado') {
            await trx('UPDATE detalle_comisiones SET fecha_mod = NOW() WHERE comision_id = ?', [
              id
            ]);
          }

          const updateResult = {
            ...validatedData,
            previousStatus: statusMap[commission.estado as number]
          };
          return updateResult;
        } catch (dbError) {
          throw new DatabaseError('Error al actualizar la comisión', dbError);
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Comisión actualizada exitosamente',
        data: result
      });
    } catch (error) {
      if (error instanceof CommissionError) {
        const response = formatErrorResponse(error);
        return res.status(error.statusCode).json(response);
      }
      throw error;
    }
  } catch (error) {
    // Manejar errores de validación de Zod
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors: error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    // Manejar error específico de "no hay campos para actualizar"
    if (error instanceof Error && error.message === 'No hay campos para actualizar') {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : String(error)
    });
  }
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  try {
    const { id } = req.query;

    if (!id || Array.isArray(id)) {
      throw new CommissionError(
        'ID de comisión es requerido y debe ser un valor único',
        'INVALID_ID',
        400
      );
    }

    try {
      // Verificar si la comisión existe y obtener su estado
      const currentCommission = (await query(
        'SELECT c.*, dc.id_detalle FROM comisiones c ' +
          'LEFT JOIN detalle_comisiones dc ON dc.comision_id = c.id_comision ' +
          'WHERE c.id_comision = ?',
        [id]
      )) as RowDataPacket[];

      if (!Array.isArray(currentCommission) || currentCommission.length === 0) {
        throw new CommissionNotFoundError(id);
      }

      const commission = currentCommission[0];

      // Verificar que no esté ya eliminada
      if (commission.estado === 0) {
        throw new CommissionInactiveError(id);
      }

      // Verificar si la comisión puede ser eliminada
      if (commission.estado === 0) {
        // Si está pagada
        throw new CommissionError(
          'No se puede eliminar una comisión que ya está pagada',
          'CANNOT_DELETE_PAID',
          400
        );
      }

      // Realizar baja lógica usando transacción
      await withTransaction(async trx => {
        try {
          // Marcar la comisión como eliminada
          await trx('UPDATE comisiones SET estado = 0, fecha_baja = NOW() WHERE id_comision = ?', [
            id
          ]);

          // También marcar como eliminados los detalles asociados
          if (commission.id_detalle) {
            await trx(
              'UPDATE detalle_comisiones SET estado = 0, fecha_baja = NOW() WHERE comision_id = ?',
              [id]
            );
          }

          // Registrar la eliminación en el historial si existe la tabla
          await trx(
            `
            INSERT INTO historial_comisiones (
              comision_id,
              accion,
              estado_anterior,
              estado_nuevo,
              fecha_accion
            ) VALUES (?, 'eliminacion', ?, 0, NOW())
          `,
            [id, commission.estado]
          ).catch(() => {
            // Ignorar error si la tabla no existe
          });
        } catch (dbError) {
          throw new DatabaseError('Error al eliminar la comisión', dbError);
        }
      });

      return res.status(200).json({
        success: true,
        message: 'Comisión eliminada exitosamente'
      });
    } catch (error) {
      if (error instanceof CommissionError) {
        const response = formatErrorResponse(error);
        return res.status(error.statusCode).json(response);
      }
      throw error;
    }
  } catch (error) {
    const response = formatErrorResponse(error);
    return res.status(response.error?.code === 'DATABASE_ERROR' ? 500 : 400).json(response);
  }
};

// Handler principal
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;

    // Validar método HTTP
    if (!['GET', 'POST', 'PUT', 'DELETE'].includes(method || '')) {
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      throw new CommissionError(`Método ${method} no permitido`, 'METHOD_NOT_ALLOWED', 405);
    }

    try {
      // Ejecutar el handler correspondiente
      switch (method) {
        case 'GET':
          return await handleGet(req, res);
        case 'POST':
          return await handlePost(req, res);
        case 'PUT':
          return await handlePut(req, res);
        case 'DELETE':
          return await handleDelete(req, res);
      }
    } catch (error) {
      // Si es un error conocido, devolverlo formateado
      if (error instanceof CommissionError) {
        const response = formatErrorResponse(error);
        return res.status(error.statusCode).json(response);
      }
      throw error; // Propagar otros errores
    }
  } catch (error: unknown) {
    // Loggear el error completo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.error('Error detallado:', error);
    } else {
      // En producción solo loggear información básica
      console.error(
        'Error en la API de comisiones:',
        error instanceof Error ? error.message : 'Error desconocido'
      );
    }

    // Formatear la respuesta de error
    const response = formatErrorResponse(error);
    const statusCode = response.error?.code === 'DATABASE_ERROR' ? 500 : 400;

    // En producción, no enviar detalles del error
    if (process.env.NODE_ENV === 'production') {
      delete response.error.details;
    }

    return res.status(statusCode).json(response);
  }
}
