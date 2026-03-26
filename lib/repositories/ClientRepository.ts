import { query, generateUUID, type TransactionQuery } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ClientSchema, type ClientType } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';

export class ClientRepository {
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

  static async getAll(): Promise<ClientType[]> {
    const clients = await query<any[]>(`
      SELECT c.*, 
      COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
      FROM clientes c 
      ORDER BY c.nombre ASC
    `);
    return clients.map(row => this.mapClientFromDB(row));
  }

  static async getById(id: string): Promise<ClientType | null> {
    const clients = await query<any[]>(`
      SELECT c.*, 
      COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
      FROM clientes c 
      WHERE c.id_cliente = ?
    `, [id]);
    return clients.length > 0 ? this.mapClientFromDB(clients[0]) : null;
  }

  static async getByIdForUpdate(trx: TransactionQuery, id: string): Promise<ClientType | null> {
    const row = await BaseRepository.findOne<any>(trx, 'clientes', 'id_cliente', id);
    return row ? this.mapClientFromDB(row) : null;
  }

  static async updateBalance(trx: TransactionQuery, id: string, amount: number): Promise<void> {
    await trx('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [amount, id]);
  }

  static async create(data: Pick<ClientType, 'run' | 'name' | 'lastName' | 'phone'>): Promise<ClientType | null> {
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
  }

  static async update(id: string, data: Partial<ClientType>): Promise<ClientType | null> {
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
  }

  static async delete(id: string): Promise<void> {
    await BaseRepository.delete(query, 'clientes', 'id_cliente', id);
  }
}
