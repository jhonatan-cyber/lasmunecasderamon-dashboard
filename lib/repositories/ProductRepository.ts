import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ProductSchema, type ProductType } from '@/lib/business/schemas';
import { BaseRepository } from './BaseRepository';

export class ProductRepository {
  private static mapProductFromDB(row: any): ProductType & { categoria?: string } {
    return {
      ...ProductSchema.parse({
        id: row.id_producto,
        code: row.codigo,
        name: row.nombre,
        category_id: row.categoria_id,
        price: row.precio,
        commission: row.comision,
        description: row.descripcion,
        status: row.estado,
        foto: row.foto,
        display_order: row.display_order,
        created_at: row.fecha_crea,
        updated_at: row.fecha_mod
      }),
      categoria: row.categoria,
      nombre: row.nombre,
      precio: row.precio,
      comision: row.comision,
      id_producto: row.id_producto,
    };
  }

  static async getAll(categoryId?: string): Promise<ProductType[]> {
    let where = 'WHERE 1=1';
    let params: any[] = [];
    if (categoryId && categoryId !== 'undefined' && categoryId !== 'NaN') {
      where = 'WHERE P.categoria_id = ?';
      params.push(categoryId);
    }
    const sql = `
      SELECT P.*, C.nombre AS categoria
      FROM productos P
      INNER JOIN categorias C ON C.id_categoria = P.categoria_id
      ${where}
      ORDER BY P.categoria_id ASC, P.display_order ASC, P.id_producto ASC
    `;
    const results = await query<any[]>(sql, params);
    return results.map(row => this.mapProductFromDB(row));
  }

  static async getById(id: string): Promise<ProductType | null> {
    const row = await BaseRepository.findOne<any>(query, 'productos', 'id_producto', id);
    return row ? this.mapProductFromDB(row) : null;
  }

  static async getByCodeOrName(code: string, name: string, categoryId: string | number): Promise<ProductType | null> {
    const results = await query<any[]>('SELECT * FROM productos WHERE (codigo = ? OR (LOWER(nombre) = LOWER(?) AND categoria_id = ?)) LIMIT 1', 
      [code, name, categoryId]);
    return results.length > 0 ? this.mapProductFromDB(results[0]) : null;
  }

  static async create(data: Partial<ProductType>, foto: string): Promise<ProductType | null> {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    await BaseRepository.insert(query, 'productos', {
      id_producto: id,
      codigo: data.code,
      nombre: data.name,
      categoria_id: data.category_id,
      precio: data.price,
      comision: data.commission,
      descripcion: data.description || '',
      estado: data.status,
      foto,
      fecha_crea: now
    });
    
    return await this.getById(id);
  }

  static async update(id: string, data: Partial<ProductType>, foto?: string): Promise<ProductType | null> {
    // Mapeamos solo los campos que vienen en 'data' para evitar sobreescribir con undefined
    const updateData: any = {
      fecha_mod: getNowInBusinessTimezone()
    };

    if (data.code !== undefined) updateData.codigo = data.code;
    if (data.name !== undefined) updateData.nombre = data.name;
    if (data.category_id !== undefined) updateData.categoria_id = data.category_id;
    if (data.price !== undefined) updateData.precio = data.price;
    if (data.commission !== undefined) updateData.comision = data.commission;
    if (data.description !== undefined) updateData.descripcion = data.description;
    if (data.status !== undefined) updateData.estado = data.status;
    if (foto !== undefined) updateData.foto = foto;

    await BaseRepository.update(query, 'productos', 'id_producto', id, updateData);
    return await this.getById(id);
  }

  static async search(term: string): Promise<ProductType[]> {
    const termWithWildcards = `%${term}%`;
    const results = await query<any[]>(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id_categoria
      WHERE p.nombre LIKE ? OR p.codigo LIKE ? OR c.nombre LIKE ?
      ORDER BY p.nombre ASC
    `, [termWithWildcards, termWithWildcards, termWithWildcards]);
    return results.map(row => this.mapProductFromDB(row));
  }

  static async reorder(items: { id: string, display_order: number }[]): Promise<void> {
    const now = getNowInBusinessTimezone();
    for (const item of items) {
      await BaseRepository.update(query, 'productos', 'id_producto', item.id, {
        display_order: item.display_order,
        fecha_mod: now
      });
    }
  }

  static async delete(id: string): Promise<void> {
    await BaseRepository.delete(query, 'productos', 'id_producto', id);
  }
}
