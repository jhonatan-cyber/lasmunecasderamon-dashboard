import { ProductSchema, type ProductType } from '@/lib/business/schemas';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { ConflictError } from '@/lib/errors/errors';
import { z } from 'zod';

type ProductInput = z.input<typeof ProductSchema>;

export class ProductService {
  static async createProduct(body: ProductInput, fotoName?: string) {
    const normalizedBody = {
      ...body,
      category_id:
        body.category_id ?? (body as ProductInput & { categoryId?: string | number }).categoryId
    };

    const validated = ProductSchema.parse(normalizedBody);

    const existing = await ProductRepository.getByCodeOrName(
      validated.code,
      validated.name,
      validated.category_id
    );

    if (existing) {
      throw new ConflictError(
        'Ya existe un producto con el mismo código o nombre en esta categoría'
      );
    }

    const foto = fotoName || body.foto || 'default.png';
    return await ProductRepository.create(validated, foto);
  }

  static async getAll(categoryId?: string | number) {
    return await ProductRepository.getAll(categoryId?.toString());
  }

  static async getById(id: string | number) {
    return await ProductRepository.getById(id.toString());
  }

  static async search(term: string) {
    return await ProductRepository.search(term);
  }

  static async update(id: string | number, data: Record<string, unknown>) {
    return await ProductRepository.update(id.toString(), data);
  }

  static async delete(id: string | number) {
    return await ProductRepository.delete(id.toString());
  }

  static async reorder(product_orders: Array<{ id: string; orden: number }>) {
    return await ProductRepository.reorder(product_orders.map(p => ({ id: p.id, display_order: p.orden })));
  }

  static async updateProduct(id: string, body: Partial<ProductInput>, fotoName?: string) {
    const normalizedBody = {
      ...body,
      category_id:
        body.category_id ||
        (body as Partial<ProductInput> & { categoryId?: string | number }).categoryId
    };

    const validated = ProductSchema.partial().parse(normalizedBody);

    const currentProduct = await ProductRepository.getById(id);
    const categoryId = validated.category_id || currentProduct?.category_id || '0';

    if (validated.code || validated.name) {
      const existing = await ProductRepository.getByCodeOrName(
        validated.code || currentProduct?.code || '',
        validated.name || currentProduct?.name || '',
        categoryId
      );

      if (existing && String(existing.id) !== String(id)) {
        throw new ConflictError(
          'Ya existe otro producto con ese código o nombre en esta categoría'
        );
      }
    }

    const foto = fotoName || body.foto || currentProduct?.foto || 'default.png';
    return await ProductRepository.update(id, { ...validated }, foto);
  }
}
