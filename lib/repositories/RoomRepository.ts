import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { RoomSchema, type RoomType } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';

export class RoomRepository {
  private static mapRoomFromDB(row: any): RoomType {
    return RoomSchema.parse({
      id: row.id_habitacion,
      name: row.nombre,
      price: row.precio,
      time: row.tiempo,
      comision_anfitriona: row.comision_anfitriona ?? null,
      status: row.en_servicio > 0 ? 2 : row.estado,
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
          `SELECT h.* FROM habitaciones h 
           WHERE h.estado = ? 
           AND NOT EXISTS (
             SELECT 1 FROM servicios s 
             WHERE s.habitacion_id = h.id_habitacion 
             AND s.estado = 1
           )
           ORDER BY h.display_order ASC, h.id_habitacion ASC`,
          [status]
        );
      } else {
        results = await query<any[]>("SELECT * FROM habitaciones WHERE estado = ? ORDER BY display_order ASC, id_habitacion ASC", [status]);
      }
    } else {
      results = await query<any[]>(
        "SELECT h.*, (SELECT COUNT(*) FROM servicios s WHERE s.habitacion_id = h.id_habitacion AND s.estado = 1) as en_servicio FROM habitaciones h ORDER BY h.display_order ASC, h.id_habitacion ASC",
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
    
    // Validar duplicado por nombre
    const dup = await query<any[]>(
      "SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?)",
      [validated.name]
    );
    if (dup.length > 0) {
      throw new Error("Ya existe una habitación con ese nombre");
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

    // Validar duplicado por nombre (excluyendo el actual)
    if (validated.name) {
      const dup = await query<any[]>(
        "SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?) AND id_habitacion != ?",
        [validated.name, id]
      );
      if (dup.length > 0) {
        throw new Error("Ya existe una habitación con ese nombre");
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
    if (action === "activate") newStatus = 1;
    else if (action === "deactivate") newStatus = 0;
    else if (action === "occupy") newStatus = 2;
    else throw new Error("Acción no válida");

    await BaseRepository.update(query, 'habitaciones', 'id_habitacion', id, { 
      estado: newStatus,
      fecha_mod: getNowInBusinessTimezone()
    });
    return await this.getById(id);
  }

  static async delete(id: string): Promise<{ success: boolean, deactivated: boolean }> {
    // Verificar referencias en servicios
    const refs = await query<any[]>(
      'SELECT COUNT(*) AS cnt FROM servicios WHERE habitacion_id = ?',
      [id]
    );
    const count = refs[0]?.cnt ?? 0;

    if (count > 0) {
      // Si hay referencias, no eliminar: desactivar por seguridad
      await BaseRepository.update(query, 'habitaciones', 'id_habitacion', id, { 
        estado: 0,
        fecha_mod: getNowInBusinessTimezone()
      });
      return { success: true, deactivated: true };
    }

    await BaseRepository.delete(query, 'habitaciones', 'id_habitacion', id);
    return { success: true, deactivated: false };
  }

  static async reorder(items: { id: string, display_order: number }[]): Promise<void> {
    const now = getNowInBusinessTimezone();
    for (const item of items) {
      await BaseRepository.update(query, 'habitaciones', 'id_habitacion', item.id, { 
        display_order: item.display_order,
        fecha_mod: now
      });
    }
  }
}
