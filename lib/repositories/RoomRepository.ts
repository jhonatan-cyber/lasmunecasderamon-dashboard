import { query, generateUUID } from '@/lib/db';
import { z } from 'zod';

export const roomSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  price: z.preprocess((v) => Number(v), z.number()),
  time: z.preprocess((v) => Number(v), z.number()),
  comision_anfitriona: z.preprocess((v) => v === '' || v === null || v === undefined ? null : Number(v), z.number().nullable().optional()),
});

export type RoomData = z.infer<typeof roomSchema>;

export class RoomRepository {
  private static mapRoomFromDB(row: any) {
    return {
      id: row.id_habitacion,
      id_habitacion: row.id_habitacion,
      name: row.nombre,
      nombre: row.nombre,
      display_order: row.display_order,
      price: row.precio,
      precio: row.precio,
      time: row.tiempo,
      tiempo: row.tiempo,
      status: row.en_servicio > 0 ? 2 : row.estado,
      estado: row.en_servicio > 0 ? 2 : row.estado,
      fecha_crea: row.fecha_crea,
      fecha_mod: row.fecha_mod,
      fecha_elim: row.fecha_elim,
      comision_anfitriona: row.comision_anfitriona ?? null,
    };
  }

  static async getAll(status?: string) {
    let results;
    if (status !== undefined) {
      if (status === '1') {
        results = await query(
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
        results = await query("SELECT * FROM habitaciones WHERE estado = ? ORDER BY display_order ASC, id_habitacion ASC", [status]);
      }
    } else {
      results = await query(
        "SELECT h.*, (SELECT COUNT(*) FROM servicios s WHERE s.habitacion_id = h.id_habitacion AND s.estado = 1) as en_servicio FROM habitaciones h ORDER BY h.display_order ASC, h.id_habitacion ASC",
        []
      );
    }
    return Array.isArray(results) ? results.map(this.mapRoomFromDB) : [];
  }

  static async create(data: RoomData) {
    // Validar duplicado por nombre
    const dup = await query(
      "SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?)",
      [data.name]
    );
    if (Array.isArray(dup) && dup.length) {
      throw new Error("Ya existe una habitación con ese nombre");
    }

    const id = generateUUID();
    await query(
      "INSERT INTO habitaciones (id_habitacion, nombre, precio, tiempo, comision_anfitriona) VALUES (?, ?, ?, ?, ?)",
      [id, data.name, data.price, data.time, data.comision_anfitriona]
    );
    return id;
  }

  static async update(id: string, data: RoomData) {
    // Validar duplicado por nombre (excluyendo el actual)
    const dup = await query(
      "SELECT id_habitacion FROM habitaciones WHERE LOWER(nombre) = LOWER(?) AND id_habitacion != ?",
      [data.name, id]
    );
    if (Array.isArray(dup) && dup.length) {
      throw new Error("Ya existe una habitación con ese nombre");
    }

    await query(
      "UPDATE habitaciones SET nombre = ?, precio = ?, tiempo = ?, comision_anfitriona = ? WHERE id_habitacion = ?",
      [data.name, data.price, data.time, data.comision_anfitriona, id]
    );
  }

  static async updateStatus(id: string, action: string) {
    let newStatus;
    if (action === "activate") newStatus = 1;
    else if (action === "deactivate") newStatus = 0;
    else if (action === "occupy") newStatus = 2;
    else throw new Error("Acción no válida");

    await query("UPDATE habitaciones SET estado = ? WHERE id_habitacion = ?", [newStatus, id]);
  }

  static async delete(id: string) {
    // Verificar referencias en servicios
    const refs: any = await query(
      'SELECT COUNT(*) AS cnt FROM servicios WHERE habitacion_id = ?',
      [id]
    );
    const count = Array.isArray(refs) ? (refs[0]?.cnt ?? 0) : 0;

    if (count > 0) {
      // Si hay referencias, no eliminar: desactivar por seguridad
      await query('UPDATE habitaciones SET estado = 0 WHERE id_habitacion = ?', [id]);
      return { success: true, deactivated: true };
    }

    await query('DELETE FROM habitaciones WHERE id_habitacion = ?', [id]);
    return { success: true, deactivated: false };
  }

  static async reorder(items: { id: string, display_order: number }[]) {
    for (const item of items) {
      await query('UPDATE habitaciones SET display_order = ? WHERE id_habitacion = ?', [item.display_order, item.id]);
    }
  }
}
