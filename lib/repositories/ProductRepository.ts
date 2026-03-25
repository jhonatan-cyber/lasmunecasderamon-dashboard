import { query, generateUUID } from '@/lib/db';
import { ProductSchema } from '@/lib/schemas';
import { getProductsList, checkProductExists } from '@/lib/procedures';

export class ProductRepository {
  static async getAll(categoryId?: string) {
    return await getProductsList(categoryId);
  }

  static async create(id: string, data: any, foto: string) {
    const validated = ProductSchema.parse(data);
    const exists = await checkProductExists(validated.code, validated.name, validated.category_id);
    if (exists) throw new Error('Producto ya existe (código o nombre duplicado)');

    await query(
      'INSERT INTO productos (id_producto, codigo, nombre, categoria_id, precio, comision, descripcion, estado, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, validated.code, validated.name, validated.category_id, validated.price, validated.commission, validated.description || '', validated.status, foto]
    );
  }

  static async update(id: string, data: any, foto: string) {
    const validated = ProductSchema.parse(data);
    const exists = await checkProductExists(validated.code, validated.name, validated.category_id, id);
    if (exists) throw new Error('Duplicado detectado');

    await query(
      'UPDATE productos SET codigo = ?, nombre = ?, category_id = ?, precio = ?, comision = ?, descripcion = ?, estado = ?, foto = ? WHERE id_producto = ?',
      [validated.code, validated.name, validated.category_id, validated.price, validated.commission, validated.description || '', validated.status, foto, id]
    );
  }

  static async search(term: string) {
    const termWithWildcards = `%${term}%`;
    return await query(`
      SELECT p.*, c.nombre as categoria_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id_categoria
      WHERE p.nombre LIKE ? OR p.codigo LIKE ? OR c.nombre LIKE ?
      ORDER BY p.nombre ASC
    `, [termWithWildcards, termWithWildcards, termWithWildcards]);
  }

  static async reorder(items: { id: string, display_order: number }[]) {
    for (const item of items) {
      await query('UPDATE productos SET display_order = ? WHERE id_producto = ?', [item.display_order, item.id]);
    }
  }

  static async delete(id: string) {
    await query('DELETE FROM productos WHERE id_producto = ?', [id]);
  }
}
