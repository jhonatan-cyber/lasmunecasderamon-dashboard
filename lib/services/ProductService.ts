import { ProductSchema, type ProductType } from '@/lib/business/schemas';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { logger } from '@/lib/utils/logger';

export class ProductService {
  static async createProduct(body: any, fotoName?: string) {
    logger.debug('[ProductService] createProduct - body:', { body });
    logger.debug('[ProductService] createProduct - fotoName:', fotoName);

    const normalizedBody = {
      ...body,
      category_id: body.category_id ?? body.categoryId,
    };

    logger.debug('[ProductService] normalizedBody:', { normalizedBody });

    const validated = ProductSchema.parse(normalizedBody);
    logger.debug('[ProductService] validated.category_id:', validated.category_id);

    const existing = await ProductRepository.getByCodeOrName(
      validated.code,
      validated.name,
      validated.category_id
    );

    if (existing) {
      throw new Error('Ya existe un producto con el mismo código o nombre en esta categoría');
    }

    const foto = fotoName || body.foto || 'default.png';
    return await ProductRepository.create(validated, foto);
  }

  static async updateProduct(id: string, body: any, fotoName?: string) {
    logger.debug('[ProductService] updateProduct - id:', id);
    logger.debug('[ProductService] updateProduct - body:', { body });
    logger.debug('[ProductService] updateProduct - fotoName:', fotoName);

    const normalizedBody = {
      ...body,
      category_id: body.category_id || body.categoryId,
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
        throw new Error('Ya existe otro producto con ese código o nombre en esta categoría');
      }
    }

    const foto = fotoName || body.foto || (currentProduct?.foto || 'default.png');

    const updateData = { ...validated };

    return await ProductRepository.update(id, updateData, foto);
  }
}
