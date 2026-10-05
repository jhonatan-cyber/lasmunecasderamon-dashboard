/**
 * Fichas de clientes — infraestructura privada del módulo Clientes.
 *
 * Mismo SQL que `ClientRepository`: altas, edición, borrado, listado,
 * detalle e historial. El historial cruza movimientos, servicios, ventas y
 * usuarios en lectura; son proyecciones explícitas para la ficha, sin
 * escrituras fuera del dominio.
 */
import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ClientSchema, type ClientType } from '@/lib/business/schemas';
import { BaseRepository } from '@/lib/database/base-repository';
import { DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';

export function mapClientFromDB(row: any): ClientType {
  return ClientSchema.parse({
    id: row.id_cliente,
    run: row.run,
    name: row.nombre,
    lastName: row.apellido,
    phone: row.telefono,
    saldo: Number(row.saldo || 0),
    deuda: Number(row.deuda || 0),
    created_at: row.fecha_crea,
    updated_at: row.fecha_mod || undefined,
    status: Number(row.estado || 1)
  });
}

export async function listarClientes(params?: {
  search?: string;
  limit?: number;
  offset?: number;
  conSaldo?: boolean;
}): Promise<{ data: ClientType[]; total: number }> {
  try {
    const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const sqlParams: any[] = [];

    let where = 'WHERE 1=1';
    if (params?.conSaldo) {
      where += ' AND c.saldo > 0';
    }
    if (params?.search) {
      where +=
        ' AND (c.nombre ILIKE ? OR c.apellido ILIKE ? OR c.run ILIKE ? OR c.telefono ILIKE ?)';
      const s = `%${params.search}%`;
      sqlParams.push(s, s, s, s);
    }

    const countSql = `SELECT COUNT(*) as total FROM clientes c ${where}`;
    const dataSql = `
      SELECT c.*,
        COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
      FROM clientes c
      ${where}
      ORDER BY c.nombre ASC
      LIMIT ? OFFSET ?
    `;

    const countRes = await query<any[]>(countSql, sqlParams);
    const total = Number(countRes[0]?.total ?? 0);
    const data = await query<any[]>(dataSql, [...sqlParams, limit, offset]);

    return { data: data.map(row => mapClientFromDB(row)), total };
  } catch (err) {
    logger.error('[clientes/fichas] Error en listarClientes:', { search: params?.search, err });
    throw new DatabaseError('Error al obtener lista de clientes', err);
  }
}

export async function obtenerCliente(id: string): Promise<ClientType | null> {
  try {
    const clients = await query<any[]>(
      `
      SELECT c.*,
      COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
      FROM clientes c
      WHERE c.id_cliente = ?
    `,
      [id]
    );
    return clients.length > 0 ? mapClientFromDB(clients[0]) : null;
  } catch (err) {
    logger.error('[clientes/fichas] Error en obtenerCliente:', { id, err });
    throw new DatabaseError(`Error al obtener cliente ${id}`, err);
  }
}

export async function crearCliente(
  data: Pick<ClientType, 'run' | 'name' | 'lastName' | 'phone'>
): Promise<ClientType | null> {
  try {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(query, 'clientes', {
      id_cliente: id,
      run: data.run || '',
      nombre: data.name,
      apellido: data.lastName,
      telefono: data.phone || '',
      fecha_crea: now
    });

    return await obtenerCliente(id);
  } catch (err) {
    logger.error('[clientes/fichas] Error en crearCliente:', { err });
    throw new DatabaseError('Error al crear cliente', err);
  }
}

export async function actualizarCliente(
  id: string,
  data: Partial<ClientType>
): Promise<ClientType | null> {
  try {
    const now = getNowInBusinessTimezone();
    const upData: any = {
      run: data.run,
      nombre: data.name,
      apellido: data.lastName,
      telefono: data.phone,
      fecha_mod: now
    };

    await BaseRepository.update(query, 'clientes', 'id_cliente', id, upData);
    return await obtenerCliente(id);
  } catch (err) {
    logger.error('[clientes/fichas] Error en actualizarCliente:', { id, err });
    throw new DatabaseError(`Error al actualizar cliente ${id}`, err);
  }
}

export async function eliminarClienteFisico(id: string): Promise<void> {
  try {
    await BaseRepository.delete(query, 'clientes', 'id_cliente', id);
  } catch (err) {
    logger.error('[clientes/fichas] Error en eliminarClienteFisico:', { id, err });
    throw new DatabaseError(`Error al eliminar cliente ${id}`, err);
  }
}

export async function obtenerHistorial(clientId: string): Promise<any[]> {
  try {
    const moves = await query<any[]>(
      `
      SELECT
        id_movimiento as id,
        'CARGA' as category,
        monto,
        metodo_pago,
        fecha_crea,
        (SELECT nick FROM usuarios WHERE id_usuario = cpm.usuario_id) as atendido_por,
        NULL as mesero,
        metadatos as detalle
      FROM clientes_prepago_movimientos cpm
      WHERE cliente_id = ? AND tipo = 'CARGA'

      UNION ALL

      SELECT
        id_movimiento as id,
        'CONSUMO' as category,
        monto,
        metodo_pago,
        fecha_crea,
        (SELECT nick FROM usuarios WHERE id_usuario = cpm.usuario_id) as atendido_por,
        NULL as mesero,
        metadatos as detalle
      FROM clientes_prepago_movimientos cpm
      WHERE cliente_id = ? AND tipo = 'CONSUMO'

      UNION ALL

      SELECT
        id_movimiento as id,
        'DEVOLUCION' as category,
        monto,
        metodo_pago,
        fecha_crea,
        (SELECT nick FROM usuarios WHERE id_usuario = cpm.usuario_id) as atendido_por,
        NULL as mesero,
        metadatos as detalle
      FROM clientes_prepago_movimientos cpm
      WHERE cliente_id = ? AND tipo = 'DEVOLUCION'
    `,
      [clientId, clientId, clientId]
    );

    const services = await query<any[]>(
      `
      SELECT
        s.id_servicio as id,
        'SERVICIO' as category,
        s.total as monto,
        s.metodo_pago,
        s.fecha_crea,
        (SELECT nick FROM usuarios WHERE id_usuario = s.created_by) as atendido_por,
        NULL as mesero,
        h.nombre as habitacion_nombre,
        s.tiempo
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      WHERE s.cliente_id = ? AND s.estado = 1
    `,
      [clientId]
    );

    const sales = await query<any[]>(
      `
      SELECT
        v.id_venta as id,
        'CONSUMO' as category,
        v.total as monto,
        v.metodo_pago,
        v.fecha_crea,
        (SELECT nick FROM usuarios WHERE id_usuario = v.created_by) as atendido_por,
        NULL as mesero,
        h.nombre as habitacion_nombre
      FROM ventas v
      LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
      WHERE v.cliente_id = ? AND v.estado = 1
    `,
      [clientId]
    );

    for (const sale of sales) {
      const products = await query<any[]>(
        `
        SELECT p.nombre, dv.cantidad
        FROM detalle_ventas dv
        JOIN productos p ON p.id_producto = dv.producto_id
        WHERE dv.venta_id = ?
      `,
        [sale.id]
      );

      const anfitrionas = await query<any[]>(
        `
        SELECT u.nick
        FROM ventas_usuarios vu
        JOIN usuarios u ON u.id_usuario = vu.usuario_id
        WHERE vu.venta_id = ?
      `,
        [sale.id]
      );

      sale.detalle = {
        habitacion: sale.habitacion_nombre,
        productos: products,
        anfitrionas: anfitrionas.map(a => a.nick)
      };
    }

    const results = [
      ...moves.map(m => ({
        ...m,
        detalle: typeof m.detalle === 'string' ? JSON.parse(m.detalle) : m.detalle
      })),
      ...services.map(s => ({
        ...s,
        detalle: {
          habitacion: s.habitacion_nombre,
          tiempo: s.tiempo
        }
      })),
      ...sales.map(v => ({
        ...v,
        detalle: v.detalle
      }))
    ];

    return results.sort(
      (a, b) => new Date(b.fecha_crea).getTime() - new Date(a.fecha_crea).getTime()
    );
  } catch (err) {
    logger.error('[clientes/fichas] Error en obtenerHistorial:', { clientId, err });
    throw new DatabaseError(`Error al obtener historial del cliente ${clientId}`, err);
  }
}
