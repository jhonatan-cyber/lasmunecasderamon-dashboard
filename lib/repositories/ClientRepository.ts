import { query, generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export class ClientRepository {
  private static mapClientFromDB(row: any) {
    return {
      id: row.id_cliente,
      run: row.run,
      name: row.nombre,
      lastName: row.apellido,
      phone: row.telefono,
      saldo: row.saldo || 0,
      deuda: row.deuda || 0,
      created_at: row.fecha_crea,
      updated_at: row.fecha_mod,
      status: row.estado
    };
  }

  static async getAll() {
    const clients = await query(`
      SELECT c.*, 
      COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
      FROM clientes c 
      ORDER BY c.nombre ASC
    `) as any[];
    return clients.map(this.mapClientFromDB);
  }

  static async getById(id: string) {
    const clients = await query(`
      SELECT c.*, 
      COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
      FROM clientes c 
      WHERE c.id_cliente = ?
    `, [id]) as any[];
    return clients.length > 0 ? this.mapClientFromDB(clients[0]) : null;
  }

  static async create(data: { run?: string, name: string, lastName: string, phone?: string }) {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await query(
      'INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.run || '', data.name, data.lastName, data.phone || '', now]
    );
    return id;
  }

  static async update(id: string, data: { run: string, name: string, lastName: string, phone: string }) {
    const now = getNowInBusinessTimezone();
    await query(
      'UPDATE clientes SET run = ?, nombre = ?, apellido = ?, telefono = ?, fecha_mod = ? WHERE id_cliente = ?',
      [data.run, data.name, data.lastName, data.phone, now, id]
    );
  }

  static async delete(id: string) {
    await query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
  }
}
