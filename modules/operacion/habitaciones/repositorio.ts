import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomSchema, RoomWriteSchema, type RoomType } from '@/lib/business/schemas';
import { esHabitacionSoloVentas } from '@/lib/business/habitaciones';
import { BaseRepository } from '@/lib/database/base-repository';
import { ConflictError, ValidationError } from '@/lib/errors/errors';

/**
 * Condición SQL de habitación "solo ventas": sin precio, sin comisión y sin
 * duración. No admite privados y nunca se ocupa.
 */
const SQL_SOLO_VENTAS =
  '(COALESCE(h.precio, 0) <= 0 AND COALESCE(h.comision_anfitriona, 0) <= 0 AND COALESCE(h.tiempo, 0) <= 0)';

/**
 * Ocupación real de la habitación, alineada con `habitacionTieneActividad` y
 * `validarHabitacionDisponibleParaServicio`: un servicio pausado (3) o una
 * cuenta abierta con tiempo siguen usando la habitación, aunque `habitaciones`
 * no tenga el estado 2 guardado.
 */
const SQL_OCUPADA = `(
  EXISTS (SELECT 1 FROM servicios s WHERE s.habitacion_id = h.id_habitacion AND s.estado IN (2, 3))
  OR EXISTS (
    SELECT 1 FROM ventas v
    WHERE v.habitacion_id = h.id_habitacion AND v.estado IN (2, 3) AND COALESCE(v.tiempo, 0) > 0
  )
  OR EXISTS (
    SELECT 1 FROM cuentas c
    WHERE c.habitacion_id = h.id_habitacion AND c.estado = 1 AND COALESCE(c.tiempo_actual, c.tiempo) > 0
  )
)`;

const SQL_SELECT_OCUPADA = `CASE WHEN ${SQL_OCUPADA} THEN 1 ELSE 0 END AS ocupada`;

export class RoomRepository {
  private static mapRoomFromDB(row: any): RoomType {
    const estadoGuardado = Number(row.estado);
    const ocupada = Number(row.ocupada ?? 0) > 0;
    let estadoHabitacion: number;
    if (estadoGuardado === 0) estadoHabitacion = 0;
    // Una habitación sin configuración nunca se ocupa: siempre se reporta libre.
    else if (esHabitacionSoloVentas(row)) estadoHabitacion = 1;
    else estadoHabitacion = ocupada || estadoGuardado === 2 ? 2 : 1;

    return RoomSchema.parse({
      id: row.id_habitacion,
      name: row.nombre,
      price: row.precio,
      time: row.tiempo,
      comision_anfitriona: row.comision_anfitriona ?? null,
      status: estadoHabitacion,
      display_order: row.display_order,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod
    });
  }

  static async getAll(status?: string): Promise<RoomType[]> {
    const order = 'ORDER BY h.display_order ASC, h.id_habitacion ASC';
    let results: any[];
    if (status === '1') {
      // Disponibles: activas y sin actividad, más las de solo ventas (nunca se
      // ocupan) mientras estén activas.
      results = await query<any[]>(
        `SELECT h.*, ${SQL_SELECT_OCUPADA}
         FROM habitaciones h
         WHERE (${SQL_SOLO_VENTAS} AND h.estado <> 0)
            OR (h.estado = 1 AND NOT ${SQL_OCUPADA})
         ${order}`,
        []
      );
    } else if (status === '2') {
      results = await query<any[]>(
        `SELECT h.*, ${SQL_SELECT_OCUPADA}
         FROM habitaciones h
         WHERE NOT ${SQL_SOLO_VENTAS}
           AND h.estado <> 0
           AND (h.estado = 2 OR ${SQL_OCUPADA})
         ${order}`,
        []
      );
    } else if (status !== undefined) {
      results = await query<any[]>(
        `SELECT h.*, ${SQL_SELECT_OCUPADA}
         FROM habitaciones h
         WHERE h.estado = ?
         ${order}`,
        [status]
      );
    } else {
      results = await query<any[]>(
        `SELECT h.*, ${SQL_SELECT_OCUPADA}
         FROM habitaciones h
         ${order}`,
        []
      );
    }
    return results.map(row => this.mapRoomFromDB(row));
  }

  static async getById(id: string): Promise<RoomType | null> {
    const rows = await query<any[]>(
      `SELECT h.*, ${SQL_SELECT_OCUPADA} FROM habitaciones h WHERE h.id_habitacion = ?`,
      [id]
    );
    return rows[0] ? this.mapRoomFromDB(rows[0]) : null;
  }

  static async create(data: any): Promise<RoomType | null> {
    const validated = RoomWriteSchema.parse(data);

    const dup = await query<any[]>(
      'SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?)',
      [validated.name]
    );
    if (dup.length > 0) {
      throw new ConflictError('Ya existe una habitación con ese nombre');
    }

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await withTransaction(async trx => {
      await trx('LOCK TABLE habitaciones IN SHARE ROW EXCLUSIVE MODE');
      const [last] = await trx<{ last_order: number }[]>(
        'SELECT COALESCE(MAX(display_order), 0) AS last_order FROM habitaciones'
      );
      await BaseRepository.insert(trx, 'habitaciones', {
        id_habitacion: id,
        nombre: validated.name,
        precio: validated.price,
        tiempo: validated.time,
        comision_anfitriona: validated.comision_anfitriona,
        fecha_crea: now,
        display_order: Number(last.last_order) + 1
      });
    });

    return await this.getById(id);
  }

  static async update(id: string, data: any): Promise<RoomType | null> {
    const validated = RoomWriteSchema.partial().parse(data);

    if (validated.name) {
      const dup = await query<any[]>(
        'SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?) AND id_habitacion != ?',
        [validated.name, id]
      );
      if (dup.length > 0) {
        throw new ConflictError('Ya existe una habitación con ese nombre');
      }
    }

    await BaseRepository.update(query, 'habitaciones', 'id_habitacion', id, {
      nombre: validated.name,
      precio: validated.price,
      tiempo: validated.time,
      comision_anfitriona: validated.comision_anfitriona,
      fecha_mod: getNowInBusinessTimezone()
    });
    return await this.getById(id);
  }

  static async updateStatus(id: string, action: string): Promise<RoomType | null> {
    let newStatus;
    if (action === 'activate' || action === 'liberate') newStatus = 1;
    else if (action === 'deactivate') newStatus = 0;
    else if (action === 'occupy') {
      // Una habitación sin precio, comisión ni duración no admite privados.
      const [habitacion] = await query<
        { precio: number | null; comision_anfitriona: number | null; tiempo: number | null }[]
      >('SELECT precio, comision_anfitriona, tiempo FROM habitaciones WHERE id_habitacion = ?', [
        id
      ]);
      if (esHabitacionSoloVentas(habitacion))
        throw new ValidationError(
          'Una habitación sin precio, comisión ni duración no puede ocuparse',
          { id, motivo: 'ROOM_SALES_ONLY' }
        );
      newStatus = 2;
    } else
      throw new ValidationError('Acción no válida', {
        action,
        allowed: ['activate', 'deactivate', 'occupy', 'liberate']
      });

    await BaseRepository.update(query, 'habitaciones', 'id_habitacion', id, {
      estado: newStatus,
      fecha_mod: getNowInBusinessTimezone()
    });
    return await this.getById(id);
  }

  static async delete(id: string): Promise<{ success: boolean; deactivated: boolean }> {
    const refs = await query<any[]>(
      'SELECT COUNT(*) AS cnt FROM servicios WHERE habitacion_id = ?',
      [id]
    );
    const count = refs[0]?.cnt ?? 0;

    if (count > 0) {
      await BaseRepository.update(query, 'habitaciones', 'id_habitacion', id, {
        estado: 0,
        fecha_mod: getNowInBusinessTimezone()
      });
      return { success: true, deactivated: true };
    }

    await BaseRepository.delete(query, 'habitaciones', 'id_habitacion', id);
    return { success: true, deactivated: false };
  }

  static async reorder(items: { id: string; display_order: number }[]): Promise<void> {
    const now = getNowInBusinessTimezone();
    await withTransaction(async trx => {
      await trx('LOCK TABLE habitaciones IN SHARE ROW EXCLUSIVE MODE');
      for (const item of items) {
        await BaseRepository.update(trx, 'habitaciones', 'id_habitacion', item.id, {
          display_order: item.display_order,
          fecha_mod: now
        });
      }
    });
  }
}
