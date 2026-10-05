import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomSchema, type RoomType } from '@/lib/business/schemas';
import { BaseRepository } from '@/lib/database/base-repository';
import { ConflictError, ValidationError } from '@/lib/errors/errors';

export class RoomRepository {
  private static mapRoomFromDB(row: any): RoomType {
    const tieneServiciosActivos = row.servicios_activos > 0;
    const tieneVentasActivas = row.ventas_activas > 0;
    const estadoHabitacion = tieneServiciosActivos || tieneVentasActivas ? 2 : row.estado;

    const precio = Number(row.precio || 0);
    const comision = Number(row.comision_anfitriona || 0);
    const esLibreIngreso = precio <= 0 || comision <= 0;
    const statusFinal = esLibreIngreso ? 1 : estadoHabitacion;

    return RoomSchema.parse({
      id: row.id_habitacion,
      name: row.nombre,
      price: row.precio,
      time: row.tiempo,
      comision_anfitriona: row.comision_anfitriona ?? null,
      status: statusFinal,
      display_order: row.display_order,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod
    });
  }

  static async getAll(status?: string): Promise<RoomType[]> {
    let results: any[];
    if (status !== undefined) {
      if (status === '1') {
        results = await query<any[]>(
          `SELECT h.*, 
            (SELECT COUNT(*) FROM servicios s WHERE s.habitacion_id = h.id_habitacion AND s.estado = 2) as servicios_activos,
            (SELECT COUNT(*) FROM ventas v WHERE v.habitacion_id = h.id_habitacion AND v.estado = 2) as ventas_activas
           FROM habitaciones h 
           WHERE h.estado = 1 
           AND NOT EXISTS (
             SELECT 1 FROM servicios s 
             WHERE s.habitacion_id = h.id_habitacion AND s.estado = 2
           )
           AND NOT EXISTS (
             SELECT 1 FROM ventas v 
             WHERE v.habitacion_id = h.id_habitacion AND v.estado = 2
           )
           ORDER BY h.display_order ASC, h.id_habitacion ASC`,
          []
        );
      } else {
        results = await query<any[]>(
          `SELECT h.*, 
            (SELECT COUNT(*) FROM servicios s WHERE s.habitacion_id = h.id_habitacion AND s.estado = 2) as servicios_activos,
            (SELECT COUNT(*) FROM ventas v WHERE v.habitacion_id = h.id_habitacion AND v.estado = 2) as ventas_activas
           FROM habitaciones h 
           WHERE h.estado = ? 
           ORDER BY h.display_order ASC, h.id_habitacion ASC`,
          [status]
        );
      }
    } else {
      results = await query<any[]>(
        `SELECT h.*, 
          (SELECT COUNT(*) FROM servicios s WHERE s.habitacion_id = h.id_habitacion AND s.estado = 2) as servicios_activos,
          (SELECT COUNT(*) FROM ventas v WHERE v.habitacion_id = h.id_habitacion AND v.estado = 2) as ventas_activas
         FROM habitaciones h 
         ORDER BY h.display_order ASC, h.id_habitacion ASC`,
        []
      );
    }
    return results.map(row => this.mapRoomFromDB(row));
  }

  static async getById(id: string): Promise<RoomType | null> {
    const row = await BaseRepository.findOne<any>(query, 'habitaciones', 'id_habitacion', id);
    return row ? this.mapRoomFromDB(row) : null;
  }

  static async create(data: any): Promise<RoomType | null> {
    const validated = RoomSchema.parse(data);

    const dup = await query<any[]>(
      'SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?)',
      [validated.name]
    );
    if (dup.length > 0) {
      throw new ConflictError('Ya existe una habitación con ese nombre');
    }

    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(query, 'habitaciones', {
      id_habitacion: id,
      nombre: validated.name,
      precio: validated.price,
      tiempo: validated.time,
      comision_anfitriona: validated.comision_anfitriona,
      fecha_crea: now
    });

    return await this.getById(id);
  }

  static async update(id: string, data: any): Promise<RoomType | null> {
    const validated = RoomSchema.partial().parse(data);

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
    if (action === 'activate') newStatus = 1;
    else if (action === 'deactivate') newStatus = 0;
    else if (action === 'occupy') newStatus = 2;
    else
      throw new ValidationError('Acción no válida', {
        action,
        allowed: ['activate', 'deactivate', 'occupy']
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
    for (const item of items) {
      await BaseRepository.update(query, 'habitaciones', 'id_habitacion', item.id, {
        display_order: item.display_order,
        fecha_mod: now
      });
    }
  }
}
