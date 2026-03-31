import { ProductSchema, type ProductType } from '@/lib/business/schemas';
import { ProductRepository } from '@/lib/repositories/ProductRepository';

export class ProductService {
  /**
   * Procesa la creación de un nuevo producto.
   */
  static async createProduct(body: any, fotoName?: string) {
    console.log('[ProductService] createProduct - body:', JSON.stringify(body, null, 2));
    console.log('[ProductService] createProduct - fotoName:', fotoName);
    
    // Normalizar nombres de campos comunes antes de validar
    const normalizedBody = {
      ...body,
      category_id: body.category_id ?? body.categoryId,
    };

    console.log('[ProductService] normalizedBody:', JSON.stringify(normalizedBody, null, 2));

    const validated = ProductSchema.parse(normalizedBody);
    console.log('[ProductService] validated.category_id:', validated.category_id);

    // Business Logic: Verificar duplicados en la misma categoría
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

  /**
   * Actualiza un producto existente.
   */
  static async updateProduct(id: string, body: any, fotoName?: string) {
    console.log('[ProductService] updateProduct - id:', id);
    console.log('[ProductService] updateProduct - body:', JSON.stringify(body, null, 2));
    console.log('[ProductService] updateProduct - fotoName:', fotoName);
    
    // Normalizar nombres de campos comunes antes de validar
    const normalizedBody = {
      ...body,
      category_id: body.category_id || body.categoryId,
    };

    const validated = ProductSchema.partial().parse(normalizedBody);

    // Business Logic: Si cambió el código o nombre, verificar que no choque con otro en la misma categoría
    // Nota: Usamos la categoría actual si no se proporciona una nueva
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
    
    // Eliminar campos que no queremos actualizar directamente desde 'validated' si son nulos/undefined
    const updateData = { ...validated };
    
    return await ProductRepository.update(id, updateData, foto);
  }
}
