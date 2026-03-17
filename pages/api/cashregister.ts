import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { Caja, CajaWithUser, CajaResumen } from '@/types/caja';
import { RowDataPacket } from 'mysql2/promise';
import { z } from 'zod';
import { withAuth, getCurrentUser } from '@/lib/middleware/auth';

const createCajaSchema = z.object({
  usuario_id_apertura: z.string().min(1, 'ID de usuario es requerido'),
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
  id_caja: z.coerce.string().min(1, 'ID de caja es requerido'),
  monto_cierre: z.number().min(0, 'El monto de cierre debe ser mayor o igual a 0'),
  usuario_id_cierre: z.coerce.string().min(1, 'ID de usuario de cierre es requerido')
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
  // Nota: en algunos esquemas `monto_cierre` no existe como columna.
  // Si no viene desde SQL, lo calculamos con la misma fórmula usada en reportes.
  monto_cierre:
    caja.monto_cierre ??
    (Number(caja.monto_apertura || 0) +
      Number(caja.efectivo || 0) +
      Number(caja.tarjeta || 0) +
      Number(caja.transferencia || 0) -
      Number(caja.devolucion || 0)),
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

    // Obtener información del usuario actual
    const currentUser = getCurrentUser(req);
    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado'
      });
    }

    // Obtener información completa del usuario incluyendo rol y permisos
    const userInfo = (await query(
      `SELECT u.*, r.nombre as rol_nombre 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.id_usuario = ? AND u.estado = 1`,
      [currentUser.id]
    )) as any[];

    if (userInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuario no encontrado'
      });
    }

    const user = userInfo[0];
    const isAdmin = user.rol_nombre?.toLowerCase() === 'administrador';

    // Verificar si tiene permisos de caja (listar)
    let hasCajaPermission = isAdmin; // Admin siempre tiene permiso

    if (!isAdmin) {
      const permissionCheck = (await query(
        `SELECT COUNT(*) as has_permission 
         FROM role_permissions rp
         INNER JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ? AND p.module = 'cash_register' AND p.action = 'view'
         AND p.deleted_at IS NULL`,
        [user.rol_id]
      )) as any[];

      hasCajaPermission = permissionCheck[0]?.has_permission > 0;
    }

    // Si no tiene permisos de caja, solo puede ver su propia caja
    const canViewAllCajas = hasCajaPermission;

    if (resumen === '1') {
      // El resumen siempre muestra la caja abierta actual (sin importar quien la abrió)
      // Esto permite que cajeros/garzones vean el turno activo aunque no hayan sido ellos quien lo abrió
      const cajaAbiertaQuery = `
        SELECT 
          c.*, 
          CONCAT(u.nombre, ' ', u.apellido) as usuario_apertura
        FROM cajas c
        LEFT JOIN usuarios u ON c.usuario_id_apertura = u.id_usuario
        WHERE c.estado = 1
        ORDER BY c.fecha_apertura DESC LIMIT 1
      `;

      const cajaAbiertaParams: any[] = [];

      const cajaAbiertaResult = (await query(
        cajaAbiertaQuery,
        cajaAbiertaParams
      )) as RowDataPacket[];

      const cajaAbiertaRow =
        Array.isArray(cajaAbiertaResult) && cajaAbiertaResult.length > 0
          ? cajaAbiertaResult[0]
          : null;

      // Contadores de cajas — solo admin ve el historial completo
      let cajasCountQuery = `
        SELECT 
          COUNT(CASE WHEN estado = 1 THEN 1 END) AS cajas_abiertas,
          COUNT(CASE WHEN estado = 0 THEN 1 END) AS cajas_cerradas
        FROM cajas
        WHERE estado IN (0,1)
      `;

      const cajasCountParams: any[] = [];

      // No filtrar por usuario — todos ven el conteo global de la caja

      const [cajasCount] = (await query(cajasCountQuery, cajasCountParams)) as RowDataPacket[];

      // Si no hay caja abierta, devolver todo en 0
      if (!cajaAbiertaRow) {
        const resumenVacio: CajaResumen = {
          total_ventas: 0,
          total_efectivo: 0,
          total_tarjeta: 0,
          total_transferencia: 0,
          total_servicios: 0,
          total_devoluciones: 0,
          total_iva: 0,
          total_propina: 0,
          total_anticipo: 0,
          total_comisiones: 0,
          cajas_abiertas: Number((cajasCount as any)?.cajas_abiertas || 0),
          cajas_cerradas: Number((cajasCount as any)?.cajas_cerradas || 0),
          balance_total: 0,
          cantidad_ventas: 0,
          cantidad_servicios: 0,
          promedio_venta: 0,
          promedio_servicio: 0,
          tiempo_abierta: undefined,
          fecha_apertura: undefined,
          usuario_apertura: undefined
        };

        return res.status(200).json({
          success: true,
          data: resumenVacio
        });
      }

      // Si hay caja abierta, obtener sus estadísticas
      const fechaApertura = (cajaAbiertaRow as any).fecha_apertura;

      // Estadísticas de ventas desde la apertura de la caja
      const [ventasStats] = (await query(
        `SELECT 
            COALESCE(COUNT(*), 0) AS cantidad,
            COALESCE(AVG(total), 0) AS promedio
         FROM ventas v
         WHERE v.estado = 1 AND v.fecha_crea >= ?`,
        [fechaApertura]
      )) as RowDataPacket[];

      const cantidadVentas = Number((ventasStats as any)?.cantidad || 0);
      const promedioVenta = Number((ventasStats as any)?.promedio || 0);

      // Estadísticas de servicios desde la apertura de la caja
      const [serviciosStats] = (await query(
        `SELECT 
            COALESCE(COUNT(*), 0) AS cantidad,
            COALESCE(AVG(total), 0) AS promedio
         FROM servicios s
         WHERE s.estado = 1 AND s.fecha_crea >= ?`,
        [fechaApertura]
      )) as RowDataPacket[];

      const cantidadServicios = Number((serviciosStats as any)?.cantidad || 0);
      const promedioServicio = Number((serviciosStats as any)?.promedio || 0);

      const montoApertura = Number((cajaAbiertaRow as any)?.monto_apertura || 0);
      const totalVentas = Number((cajaAbiertaRow as any)?.venta || 0);
      const totalEfectivo = Number((cajaAbiertaRow as any)?.efectivo || 0);
      const totalTarjeta = Number((cajaAbiertaRow as any)?.tarjeta || 0);
      const totalTransferencia = Number((cajaAbiertaRow as any)?.transferencia || 0);
      const totalServicios = Number((cajaAbiertaRow as any)?.servicio || 0);
      const totalDevoluciones = Number((cajaAbiertaRow as any)?.devolucion || 0);
      const totalIva = Number((cajaAbiertaRow as any)?.iva || 0);
      const totalPropina = Number((cajaAbiertaRow as any)?.propina || 0);
      const totalAnticipo = Number((cajaAbiertaRow as any)?.anticipo || 0);
      const totalComisiones = Number((cajaAbiertaRow as any)?.comision || 0);

      // Calcular balance sumando efectivo + monto base + otros pagos - devoluciones 
      const balanceTotal = totalEfectivo + totalTarjeta + totalTransferencia + montoApertura - totalDevoluciones;
      // Efectivo real esperando en la caja fisica (ventas efectivo + base + propinas/otros ingresos en efectivo teoricos)
      const efectivoEsperado = totalEfectivo + montoApertura;

      const resumenCompleto: CajaResumen = {
        total_ventas: totalVentas,
        total_efectivo: efectivoEsperado,
        total_tarjeta: totalTarjeta,
        total_transferencia: totalTransferencia,
        total_servicios: totalServicios,
        total_devoluciones: totalDevoluciones,
        total_iva: totalIva,
        total_propina: totalPropina,
        total_anticipo: totalAnticipo,
        total_comisiones: totalComisiones,
        cajas_abiertas: Number((cajasCount as any)?.cajas_abiertas || 0),
        cajas_cerradas: Number((cajasCount as any)?.cajas_cerradas || 0),
        monto_apertura: montoApertura,
        balance_total: balanceTotal,
        cantidad_ventas: cantidadVentas,
        cantidad_servicios: cantidadServicios,
        promedio_venta: promedioVenta,
        promedio_servicio: promedioServicio,
        tiempo_abierta: new Date().toISOString(),
        fecha_apertura: (cajaAbiertaRow as any)?.fecha_apertura,
        usuario_apertura: (cajaAbiertaRow as any)?.usuario_apertura
      };

      return res.status(200).json({
        success: true,
        data: resumenCompleto
      });
    }

    if (id) {
      // Obtener una caja específica por ID
      const cajaId = id as string;

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

      // Si no tiene permisos de caja, solo mostrar su caja abierta
      if (!canViewAllCajas) {
        whereClause += ' AND c.usuario_id_apertura = ? AND c.estado = 1';
        params.push(currentUser.id);
      } else {
        // Para usuarios con permisos de caja, solo mostrar cajas abiertas
        if (estado !== undefined) {
          whereClause += ' AND c.estado = ?';
          params.push(estado);
        } else {
          // Por defecto, solo mostrar cajas abiertas si tiene permisos
          whereClause += ' AND c.estado = 1';
        }
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
    console.error('❌ Error en GET /api/cashregister:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
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
          errors: validationError.issues.map((err: z.ZodIssue) => ({
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
    const cajaId = generateUUID();
    await query(
      `INSERT INTO cajas (
        id_caja,
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
      ) VALUES (?, NOW(), ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1)`,
      [cajaId, validatedData.usuario_id_apertura, validatedData.monto_apertura]
    );

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

    const cajaId = id;

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
          errors: validationError.issues.map((err: z.ZodIssue) => ({
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
          errors: validationError.issues.map((err: z.ZodIssue) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      }
      throw validationError;
    }

    // Verificar si la caja existe y está abierta
    const cajaExists = (await query(
      `SELECT 
         id_caja,
         estado,
         monto_apertura,
         efectivo,
         tarjeta,
         transferencia,
         devolucion
       FROM cajas 
       WHERE id_caja = ?`,
      [validatedData.id_caja]
    )) as RowDataPacket[];

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

    // Calcular monto de cierre siguiendo la regla de negocio:
    // - Sin transacciones: monto_cierre = monto_apertura
    // - Con transacciones: monto_cierre = monto_apertura + efectivo + tarjeta + transferencia - devoluciones
    const montoApertura = Number((caja as any).monto_apertura || 0);
    const efectivo = Number((caja as any).efectivo || 0);
    const tarjeta = Number((caja as any).tarjeta || 0);
    const transferencia = Number((caja as any).transferencia || 0);
    const devoluciones = Number((caja as any).devolucion || 0);

    const montoCierreCalculado =
      montoApertura + efectivo + tarjeta + transferencia - devoluciones;

    // Obtener usuarios con logins activos que NO sean administradores ni cajeros
    const loginsActivos = (await query(`
      SELECT l.id_login, l.usuario_id, r.nombre as rol_nombre
      FROM logins l
      INNER JOIN usuarios u ON l.usuario_id = u.id_usuario
      INNER JOIN roles r ON u.rol_id = r.id_rol
      WHERE l.estado = 1 
      AND r.nombre NOT IN ('administrador', 'cajero')
    `)) as RowDataPacket[];

    if (loginsActivos && loginsActivos.length > 0) {
      // Cerrar logins de usuarios que no son administradores ni cajeros
      await query(`
        UPDATE logins l
        INNER JOIN usuarios u ON l.usuario_id = u.id_usuario
        INNER JOIN roles r ON u.rol_id = r.id_rol
        SET l.estado = 0
        WHERE l.estado = 1 
        AND r.nombre NOT IN ('administrador', 'cajero')
      `);
    } else {
      console.log('ℹ️ [CAJA] No hay sesiones activas para cerrar');
    }

    // Luego: cerrar la caja
    const cierreResult = (await query(
      `UPDATE cajas 
       SET 
           usuario_id_cierre = ?, 
           fecha_cierre = NOW(), 
           monto_cierre = ?,
           estado = 0
       WHERE id_caja = ?`,
      [validatedData.usuario_id_cierre, montoCierreCalculado, validatedData.id_caja]
    )) as any;

    // mysql2 devuelve ResultSetHeader para UPDATE
    const affectedRows =
      typeof cierreResult?.affectedRows === 'number' ? cierreResult.affectedRows : undefined;

    if (affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'No se pudo cerrar la caja (no encontrada o ya cerrada)'
      });
    }

    // Obtener la caja cerrada
    const cajaCerradaRows = (await query(
      `
        SELECT 
          c.*,
          (c.monto_apertura + c.efectivo + c.tarjeta + c.transferencia - c.devolucion) AS monto_cierre,
          CONCAT(u1.nombre, ' ', u1.apellido) as cajero_nombre,
          CONCAT(u2.nombre, ' ', u2.apellido) as cajero_cierre_nombre
        FROM cajas c
        LEFT JOIN usuarios u1 ON c.usuario_id_apertura = u1.id_usuario
        LEFT JOIN usuarios u2 ON c.usuario_id_cierre = u2.id_usuario
        WHERE c.id_caja = ?
      `,
      [validatedData.id_caja]
    )) as RowDataPacket[];

    const cajaCerrada =
      Array.isArray(cajaCerradaRows) && cajaCerradaRows.length > 0
        ? cajaCerradaRows[0]
        : null;

    if (!cajaCerrada) {
      return res.status(404).json({
        success: false,
        message: 'Caja cerrada pero no se pudo recuperar el registro'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Caja cerrada exitosamente',
      data: mapCajaWithUserFromDB(cajaCerrada)
    });
  } catch (error) {
    console.error('❌ Error en PATCH /api/cashregister:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
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

  const cajaId = id as string;

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
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default withAuth(handler);
