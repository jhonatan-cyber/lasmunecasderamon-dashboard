import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ClientSchema, type ClientType } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';
import { CashRegisterRepository } from './CashRegisterRepository';
import { BusinessError, NotFoundError, DatabaseError } from '@/lib/errors/errors';
import { logger } from '@/lib/utils/logger';
import {
  parsePagosMixtos,
  validatePagosMixtos,
  calcularDeltasCaja
} from '@/lib/business/pagosMixtos';

export class ClientRepository {
  private static getPrepagoCajaDeltas(
    monto: number,
    metodoPago?: string,
    pagosMixtos: Array<{ metodo: string; monto: number }> = []
  ) {
    const metodo = String(metodoPago || 'efectivo');
    const pagosCaja =
      metodo === 'mixto'
        ? calcularDeltasCaja(pagosMixtos)
        : {
            efectivo: metodo === 'efectivo' ? monto : 0,
            tarjeta: metodo === 'tarjeta' ? monto : 0,
            transferencia: metodo === 'transferencia' ? monto : 0
          };

    return {
      efectivo: pagosCaja.efectivo || 0,
      tarjeta: pagosCaja.tarjeta || 0,
      transferencia: pagosCaja.transferencia || 0,
      prepago: 0
    };
  }

  private static mapClientFromDB(row: any): ClientType {
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

  static async getAll(params?: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ data: ClientType[]; total: number }> {
    try {
      const limit = params?.limit ?? 50;
    const offset = params?.offset ?? 0;
    const sqlParams: any[] = [];

    let where = 'WHERE 1=1';
    if (params?.search) {
      where += ' AND (c.nombre ILIKE ? OR c.apellido ILIKE ? OR c.run ILIKE ? OR c.telefono ILIKE ?)';
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

    return { data: data.map(row => this.mapClientFromDB(row)), total };
    } catch (err) {
      logger.error('[ClientRepository] Error en getAll:', { search: params?.search, err });
      throw new DatabaseError('Error al obtener lista de clientes', err);
    }
  }

  static async getById(id: string): Promise<ClientType | null> {
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
    return clients.length > 0 ? this.mapClientFromDB(clients[0]) : null;
    } catch (err) {
      logger.error('[ClientRepository] Error en getById:', { id, err });
      throw new DatabaseError(`Error al obtener cliente ${id}`, err);
    }
  }

  static async getByIdForUpdate(trx: TransactionQuery, id: string): Promise<ClientType | null> {
    try {
      const row = await BaseRepository.findOne<any>(trx, 'clientes', 'id_cliente', id);
    return row ? this.mapClientFromDB(row) : null;
    } catch (err) {
      logger.error('[ClientRepository] Error en getByIdForUpdate:', { id, err });
      throw new DatabaseError(`Error al obtener cliente ${id} para actualizar`, err);
    }
  }

  static async updateBalance(trx: TransactionQuery, id: string, amount: number): Promise<void> {
    try {
      await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [amount, id]);
    } catch (err) {
      logger.error('[ClientRepository] Error en updateBalance:', { id, amount, err });
      throw new DatabaseError(`Error al actualizar saldo del cliente ${id}`, err);
    }
  }

  static async create(
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

    return await this.getById(id);
    } catch (err) {
      logger.error('[ClientRepository] Error en create:', { err });
      throw new DatabaseError('Error al crear cliente', err);
    }
  }

  static async update(id: string, data: Partial<ClientType>): Promise<ClientType | null> {
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
    return await this.getById(id);
    } catch (err) {
      logger.error('[ClientRepository] Error en update:', { id, err });
      if (err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al actualizar cliente ${id}`, err);
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await BaseRepository.delete(query, 'clientes', 'id_cliente', id);
    } catch (err) {
      logger.error('[ClientRepository] Error en delete:', { id, err });
      throw new DatabaseError(`Error al eliminar cliente ${id}`, err);
    }
  }

  static async getHistory(clientId: string): Promise<any[]> {
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
      logger.error('[ClientRepository] Error en getHistory:', { clientId, err });
      throw new DatabaseError(`Error al obtener historial del cliente ${clientId}`, err);
    }
  }

  static async addPrepago(data: {
    cliente_id: string;
    monto: number;
    tipo: 'CARGA';
    metodo_pago?: string;
    pagos_mixtos?: Array<{ metodo: string; monto: number }>;
    usuario_id?: string;
    metadatos?: any;
  }): Promise<void> {
    try {
      const moveId = generateUUID();
    const now = getNowInBusinessTimezone();
    const metodoPago = String(data.metodo_pago || 'efectivo');
    const pagosMixtos = parsePagosMixtos(data.pagos_mixtos);

    if (metodoPago === 'mixto') {
      validatePagosMixtos(pagosMixtos, Number(data.monto || 0));
    }

    const { withTransaction } = await import('@/lib/database/db');

    await withTransaction(async trx => {
      const idCaja = await CashRegisterRepository.getCurrentCajaId(trx);
      if (!idCaja) {
        throw new BusinessError(
          'No hay una caja abierta para registrar la recarga prepago',
          'NO_CAJA_ABIERTA'
        );
      }

      const metadatos =
        data.metadatos || metodoPago === 'mixto'
          ? JSON.stringify({
              ...(data.metadatos || {}),
              ...(metodoPago === 'mixto' ? { pagos_mixtos: pagosMixtos } : {})
            })
          : null;

      await BaseRepository.insert(trx, 'clientes_prepago_movimientos', {
        id_movimiento: moveId,
        cliente_id: data.cliente_id,
        tipo: data.tipo,
        monto: data.monto,
        metodo_pago: metodoPago,
        usuario_id: data.usuario_id || null,
        fecha_crea: now,
        metadatos
      });

      await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [
        data.monto,
        data.cliente_id
      ]);

      await CashRegisterRepository.updateBalances(
        trx,
        idCaja,
        this.getPrepagoCajaDeltas(data.monto, metodoPago, pagosMixtos)
      );

      // Crear cuenta prepago automaticamente (visible en modulo cuentas)
      // Solo actualiza Saldo prepago pendiente, no afecta caja mas alla de lo ya hecho
      try {
        const cuentaId = generateUUID();
        const codigoPrepago = `PREP-${Math.random().toString(36).substring(2, 6).toUpperCase()}${Date.now().toString().slice(-4)}`;
        await BaseRepository.insert(trx, 'cuentas', {
          id_cuenta: cuentaId,
          codigo: codigoPrepago,
          cliente_id: data.cliente_id,
          total_comision: 0,
          habitacion_id: null,
          sub_total: data.monto,
          total: data.monto,
          propina: 0,
          fecha_crea: now,
          estado: 1,
          tiempo: 0,
          tiempo_actual: 0,
          tiempo_inicio_actual: null,
          habitaciones_historial: null,
          created_by: data.usuario_id || null
        });

        // Detalle generico para trazabilidad (sin producto especifico)
        await BaseRepository.insert(trx, 'detalle_cuentas', {
          id_detalle_cuenta: generateUUID(),
          cuenta_id: cuentaId,
          producto_id: null,
          precio: data.monto,
          cantidad: 1,
          sub_total: data.monto,
          comision: 0,
          hostess_id: null,
          fecha_crea: now,
          created_by: data.usuario_id || null
        });
      } catch (cuentaErr) {
        // No bloquea la recarga si falla la cuenta (log y continua)
        logger.warn('[ClientRepository] No se pudo crear cuenta prepago automatica:', {
          cliente_id: data.cliente_id,
          err: cuentaErr instanceof Error ? cuentaErr.message : String(cuentaErr)
        });
      }
    });
    } catch (err) {
      logger.error('[ClientRepository] Error en addPrepago:', { cliente_id: data.cliente_id, err });
      if (err instanceof BusinessError || err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al agregar prepago para cliente ${data.cliente_id}`, err);
    }
  }

  static async devolverSaldo(data: {
    cliente_id: string;
    monto: number;
    metodo_pago: string;
    motivo?: string;
    usuario_id?: string;
  }): Promise<void> {
    try {
      const monto = Number(data.monto);
      // Devolucion siempre por transferencia (no afecta caja)
      const metodo = 'transferencia';
      const motivo = String(data.motivo || 'Devolucion de saldo').trim();

      if (!data.cliente_id || !monto || monto <= 0) {
        throw new BusinessError('Monto de devolucion invalido', 'MONTO_INVALIDO');
      }

      const { withTransaction } = await import('@/lib/database/db');

      await withTransaction(async trx => {
        // Lock cliente y validar saldo (no requiere caja abierta, solo actualiza saldo)
        const clienteRows = await trx<any[]>(
          'SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE',
          [data.cliente_id]
        );
        if (!clienteRows || clienteRows.length === 0) {
          throw new NotFoundError('Cliente no encontrado');
        }
        const saldoActual = Number(clienteRows[0].saldo || 0);
        if (monto > saldoActual) {
          throw new BusinessError(
            `Saldo insuficiente. Disponible: $${saldoActual.toLocaleString('es-CL')}`,
            'SALDO_INSUFICIENTE'
          );
        }

        const moveId = generateUUID();
        const now = getNowInBusinessTimezone();
        const metadatos = JSON.stringify({ motivo, metodo_devolucion: metodo });

        await BaseRepository.insert(trx, 'clientes_prepago_movimientos', {
          id_movimiento: moveId,
          cliente_id: data.cliente_id,
          tipo: 'DEVOLUCION',
          monto,
          metodo_pago: metodo,
          usuario_id: data.usuario_id || null,
          fecha_crea: now,
          metadatos
        });

        await trx('UPDATE clientes SET saldo = GREATEST(0, saldo - ?) WHERE id_cliente = ?', [
          monto,
          data.cliente_id
        ]);

        // No se descuenta de caja (efectivo/tarjeta/transferencia/devolucion).
        // Solo se actualiza el saldo del cliente; el "Saldo prepago pendiente clientes"
        // en caja se calcula como SUM(saldo) y se refleja automaticamente.

        // Auto-cierre de cuentas PREP-* si saldo llega a 0
        const [saldoRow] = await trx<any[]>(
          'SELECT saldo FROM clientes WHERE id_cliente = ?',
          [data.cliente_id]
        );
        if (Number(saldoRow?.saldo || 0) === 0) {
          await trx(
            `UPDATE cuentas SET estado = 0, fecha_mod = ? WHERE cliente_id = ? AND codigo LIKE 'PREP-%' AND estado = 1`,
            [now, data.cliente_id]
          );
        }
      });
    } catch (err) {
      logger.error('[ClientRepository] Error en devolverSaldo:', { cliente_id: data.cliente_id, err });
      if (err instanceof BusinessError || err instanceof NotFoundError) throw err;
      throw new DatabaseError(`Error al devolver saldo para cliente ${data.cliente_id}`, err);
    }
  }
}
