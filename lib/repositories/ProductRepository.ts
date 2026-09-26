import { query, generateUUID, withTransaction } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ProductSchema, type ProductType } from '@/lib/business/schemas';
import { logger } from '@/lib/utils/logger';
import { BaseRepository } from './BaseRepository';
import { InventoryRepository } from './InventoryRepository';

export interface NewPresentacion {
  nombre: string;
  codigo_barras?: string | null;
  precio_compra?: number;
  foto?: string | null;
  cantidad?: number;
}

export class ProductRepository {
  private static normalizeSearchText(value: string | null | undefined): string {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private static mapProductFromDB(row: any): ProductType & {
    categoria?: string;
    nombre?: string;
    precio?: number;
    comision?: number;
    id_producto?: string;
  } {
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
        stock_almacen: row.stock_almacen ?? 0,
        foto: row.foto,
        display_order: row.display_order,
        max_anfitrionas: row.max_anfitrionas ?? null,
        ml_shot: row.ml_shot ?? null,
        created_at: row.fecha_crea,
        updated_at: row.fecha_mod
      }),
      categoria: row.categoria,
      nombre: row.nombre,
      precio: row.precio,
      comision: row.comision,
      id_producto: row.id_producto
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

  static async getByCodeOrName(
    code: string,
    name: string,
    categoryId: string | number
  ): Promise<ProductType | null> {
    const results = await query<any[]>(
      'SELECT * FROM productos WHERE (codigo = ? OR (LOWER(nombre) = LOWER(?) AND categoria_id = ?)) LIMIT 1',
      [code, name, categoryId]
    );
    return results.length > 0 ? this.mapProductFromDB(results[0]) : null;
  }

  static async create(
    data: Partial<ProductType>,
    foto: string,
    opts?: { presentaciones?: NewPresentacion[] }
  ): Promise<
    (ProductType & { codigos_generados?: { codigo: string; codigo_barras: string }[] }) | null
  > {
    const id = generateUUID();
    const now = getNowInBusinessTimezone();
    const presentaciones = opts?.presentaciones ?? [];
    // Sin foto global: el catálogo usa la foto de la primera presentación con imagen.
    const primeraFoto = presentaciones.find(p => p.foto)?.foto ?? null;
    const fotoProducto = foto && foto !== 'default.png' ? foto : (primeraFoto ?? 'default.png');

    const codigos: { codigo: string; codigo_barras: string }[] = [];
    await withTransaction(async trx => {
      await BaseRepository.insert(trx, 'productos', {
        id_producto: id,
        codigo: data.code,
        nombre: data.name,
        categoria_id: data.category_id,
        precio: data.price ?? 0,
        comision: data.commission ?? 0,
        descripcion: data.description || '',
        estado: data.status,
        stock_almacen: 0,
        ml_shot: data.ml_shot ?? null,
        foto: fotoProducto,
        fecha_crea: now
      });

      for (const p of presentaciones) {
        const creada = await InventoryRepository.createPresentation(trx, {
          producto_id: id,
          nombre: p.nombre,
          codigo_barras: p.codigo_barras,
          precio_compra: p.precio_compra,
          foto: p.foto
        });
        const cantidad = Math.max(0, Math.floor(p.cantidad ?? 0));
        if (cantidad > 0) {
          const generados = await InventoryRepository.generateUnits(trx, id, cantidad, creada.id);
          codigos.push(...generados);
        }
      }

      await InventoryRepository.syncStockTotal(trx, id);
    });

    const created = await this.getById(id);
    return created ? { ...created, codigos_generados: codigos } : null;
  }

  static async update(
    id: string,
    data: Partial<ProductType>,
    foto?: string,
    opts?: { presentacionesNuevas?: NewPresentacion[] }
  ): Promise<ProductType | null> {
    // El guard "este producto se administra desde Inventario" consultaba
    // inventario_presentaciones.producto_bar_id, una columna del diseño viejo
    // (inventario_productos) que ya no existe: el error lo tragaba el try/catch,
    // asi que nunca bloqueaba nada. Ademas hoy las presentaciones SE editan
    // desde el formulario de producto, con lo cual bloquear por tener
    // presentaciones romperia ese mismo flujo.
    const updateData: any = {
      fecha_mod: getNowInBusinessTimezone()
    };

    if (data.code !== undefined) updateData.codigo = data.code;
    if (data.name !== undefined) updateData.nombre = data.name;
    if (data.category_id !== undefined) updateData.categoria_id = data.category_id;
    if (data.price !== undefined) updateData.precio = data.price;
    if (data.commission !== undefined) updateData.comision = data.commission;
    if (data.max_anfitrionas !== undefined) updateData.max_anfitrionas = data.max_anfitrionas;
    if (data.ml_shot !== undefined) updateData.ml_shot = data.ml_shot;
    if (data.stock_almacen !== undefined) updateData.stock_almacen = data.stock_almacen;
    if (data.description !== undefined) updateData.descripcion = data.description;
    if (data.status !== undefined) updateData.estado = data.status;
    if (foto !== undefined) {
      logger.debug('[ProductRepository] Updating foto:', foto);
      updateData.foto = foto;
    }

    const presentacionesNuevas = opts?.presentacionesNuevas ?? [];
    const primeraFotoNueva = presentacionesNuevas.find(p => p.foto)?.foto ?? null;
    if (primeraFotoNueva && (foto === undefined || foto === 'default.png' || foto === '')) {
      updateData.foto = primeraFotoNueva;
    }

    await withTransaction(async trx => {
      await BaseRepository.update(trx, 'productos', 'id_producto', id, updateData);

      for (const p of presentacionesNuevas) {
        const creada = await InventoryRepository.createPresentation(trx, {
          producto_id: id,
          nombre: p.nombre,
          codigo_barras: p.codigo_barras,
          precio_compra: p.precio_compra,
          foto: p.foto
        });
        const cantidad = Math.max(0, Math.floor(p.cantidad ?? 0));
        if (cantidad > 0) {
          await InventoryRepository.generateUnits(trx, id, cantidad, creada.id);
        }
      }

      await InventoryRepository.syncStockTotal(trx, id);
    });
    return await this.getById(id);
  }

  static async search(term: string): Promise<ProductType[]> {
    const normalizedTerm = this.normalizeSearchText(term);
    if (!normalizedTerm) return [];

    const searchTerm = term.trim();
    const termWithWildcards = `%${searchTerm}%`;
    const results = await query<any[]>(
      `
      SELECT p.*, c.nombre as categoria
      FROM productos p
      LEFT JOIN categorias c ON p.categoria_id = c.id_categoria
      WHERE (LOWER(p.nombre) LIKE LOWER(?)
         OR LOWER(p.codigo) LIKE LOWER(?)
         OR LOWER(p.descripcion) LIKE LOWER(?)
         OR LOWER(c.nombre) LIKE LOWER(?))
         AND p.estado = 1
      ORDER BY p.nombre ASC
    `,
      [termWithWildcards, termWithWildcards, termWithWildcards, termWithWildcards]
    );

    if (results.length > 0 && searchTerm === normalizedTerm) {
      return results.map(row => this.mapProductFromDB(row));
    }

    const allProducts = await this.getAll();
    return allProducts.filter(product => {
      const haystack = [
        (product as any).nombre,
        product.name,
        product.code,
        product.description,
        (product as any).categoria
      ]
        .map(value => this.normalizeSearchText(value))
        .join(' ');

      return haystack.includes(normalizedTerm);
    });
  }

  static async reorder(items: { id: string; display_order: number }[]): Promise<void> {
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

  static async getChampagneTiers(
    productoId: string
  ): Promise<{ anfitrionas: number; precio: number; comision: number }[]> {
    const rows = await query<any[]>(
      'SELECT anfitrionas, precio, comision FROM producto_champagne_tiers WHERE producto_id = ? ORDER BY anfitrionas ASC',
      [productoId]
    );
    return rows.map(r => ({
      anfitrionas: Number(r.anfitrionas),
      precio: Number(r.precio ?? 0),
      comision: Number(r.comision ?? 0)
    }));
  }

  static async saveChampagneTiers(
    productoId: string,
    tiers: { anfitrionas: number; precio: number; comision: number }[]
  ): Promise<void> {
    await withTransaction(async trx => {
      await trx('DELETE FROM producto_champagne_tiers WHERE producto_id = ?', [productoId]);
      for (const tier of tiers) {
        await BaseRepository.insert(trx, 'producto_champagne_tiers', {
          id: generateUUID(),
          producto_id: productoId,
          anfitrionas: tier.anfitrionas,
          precio: tier.precio,
          comision: tier.comision
        });
      }
    });
  }
}
