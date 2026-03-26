import { ProductSchema, type ProductType } from '@/lib/business/schemas';
import { ProductRepository } from '@/lib/repositories/ProductRepository';

export class ProductService {
  /**
   * Procesa la creación de un nuevo producto.
   */
  static async createProduct(body: any) {
    const validated = ProductSchema.omit({ id: true }).parse(body);

    // Business Logic: Verificar duplicados
    const existing = await ProductRepository.getByCodeOrName(validated.code, validated.name, validated.category_id);
    if (existing) {
      throw new Error('Producto ya existe (código o nombre duplicado en esta categoría)');
    }

    const foto = body.foto || 'default.png';
    return await ProductRepository.create(validated, foto);
  }

  /**
   * Actualiza un producto existente.
   */
  static async updateProduct(id: string, body: any) {
    const validated = ProductSchema.partial().omit({ id: true }).parse(body);

    // Business Logic: Si cambió el código o nombre, verificar que no choque con otro
    if (validated.code || validated.name) {
      const existing = await ProductRepository.getByCodeOrName(
        validated.code || '', 
        validated.name || '', 
        validated.category_id || 0
      );
      if (existing && existing.id !== id) {
        throw new Error('Duplicado detectado');
      }
    }

    const foto = body.foto || 'default.png';
    return await ProductRepository.update(id, validated, foto);
  }
}
