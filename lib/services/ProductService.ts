import { ProductSchema, PresentacionSchema, type ProductType } from '@/lib/business/schemas';
import { ProductRepository, type NewPresentacion } from '@/lib/repositories/ProductRepository';
import { InventoryRepository, esEstadoUnidadValido } from '@/lib/repositories/InventoryRepository';
import { ConflictError, ValidationError, NotFoundError } from '@/lib/errors/errors';
import { z } from 'zod';
import { SaleOptionsSchema } from '@/lib/business/schemas/sale-options';

type ProductInput = z.input<typeof ProductSchema>;

function parsePresentaciones(input: unknown, fotos?: (string | null)[]): NewPresentacion[] {
  if (input === undefined || input === null || input === '') return [];
  const raw = typeof input === 'string' ? JSON.parse(input) : input;
  const parsed = z.array(PresentacionSchema).safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      'Presentaciones inválidas: cada una requiere un nombre',
      parsed.error.issues
    );
  }
  return parsed.data.map((p, i) => ({
    nombre: p.nombre.trim(),
    codigo_barras: p.codigo_barras?.trim() ? p.codigo_barras.trim() : null,
    precio_compra: p.precio_compra ?? 0,
    foto: fotos?.[i] ?? p.foto ?? null,
    cantidad: p.cantidad ?? 0
  }));
}

async function assertBarcodesAvailable(
  presentaciones: NewPresentacion[],
  excludePresentationId?: string
): Promise<void> {
  const vistos = new Set<string>();
  for (const p of presentaciones) {
    if (!p.codigo_barras) continue;
    if (vistos.has(p.codigo_barras)) {
      throw new ValidationError(`Código de barras duplicado: ${p.codigo_barras}`);
    }
    vistos.add(p.codigo_barras);
    const existente = await InventoryRepository.findByBarcode(p.codigo_barras);
    if (existente && existente.id !== excludePresentationId) {
      throw new ConflictError(
        `El código de barras ${p.codigo_barras} ya está registrado en otro producto`
      );
    }
  }
}

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
    const presentaciones = parsePresentaciones(
      (body as any).presentaciones,
      (body as any).presentacion_fotos
    );
    await assertBarcodesAvailable(presentaciones);
    const created = await ProductRepository.create(validated, foto, { presentaciones });
    return created;
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
    return await ProductRepository.reorder(
      product_orders.map(p => ({ id: p.id, display_order: p.orden }))
    );
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
    const presentacionesNuevas = parsePresentaciones(
      (body as any).presentaciones,
      (body as any).presentacion_fotos
    );
    await assertBarcodesAvailable(presentacionesNuevas);
    return await ProductRepository.update(id, { ...validated }, foto, { presentacionesNuevas });
  }

  static async addPresentation(
    productoId: string,
    input: unknown
  ): Promise<{
    id: string;
    producto_id: string;
    nombre: string;
    codigo_barras: string | null;
    precio_compra: number;
    foto: string | null;
  }> {
    const parsed = PresentacionSchema.safeParse(
      typeof input === 'string' ? JSON.parse(input) : input
    );
    if (!parsed.success) {
      throw new ValidationError('Presentación inválida: requiere un nombre', parsed.error.issues);
    }
    const nombre = parsed.data.nombre.trim();
    const codigo_barras = parsed.data.codigo_barras?.trim() || null;
    const precio_compra = parsed.data.precio_compra ?? 0;
    const foto = parsed.data.foto || null;
    const producto = await ProductRepository.getById(productoId);
    if (!producto) throw new NotFoundError('Producto', productoId);
    await assertBarcodesAvailable([{ nombre, codigo_barras, precio_compra }]);
    return await InventoryRepository.createPresentationStandalone({
      producto_id: productoId,
      nombre,
      codigo_barras,
      precio_compra,
      foto
    });
  }

  static async removePresentation(id: string): Promise<void> {
    await InventoryRepository.deletePresentation(id);
  }

  static async updatePresentation(id: string, input: unknown): Promise<void> {
    const raw = typeof input === 'string' ? JSON.parse(input) : input;
    const parsed = z
      .object({
        nombre: z.string().trim().min(1, 'Nombre de presentación requerido').max(100).optional(),
        codigo_barras: z
          .string()
          .trim()
          .max(50)
          .optional()
          .transform(v => (v === undefined || v === '' ? null : v)),
        precio_compra: z.preprocess(
          v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
          z.number().int().min(0, 'El precio de compra no puede ser negativo').optional()
        ),
        precio_venta: z.preprocess(
          v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
          z.number().int().min(0, 'El precio de venta no puede ser negativo').optional()
        ),
        comision: z.preprocess(
          v => (v === undefined || v === null || v === '' ? undefined : Number(v)),
          z.number().int().min(0, 'La comisión no puede ser negativa').optional()
        )
      })
      .safeParse(raw);
    if (!parsed.success) {
      throw new ValidationError('Presentación inválida', parsed.error.issues);
    }
    const { nombre, codigo_barras, precio_compra, precio_venta, comision } = parsed.data;
    const rawObj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const has = (k: string) => rawObj[k] !== undefined;
    if (
      !has('nombre') &&
      !has('codigo_barras') &&
      !has('precio_compra') &&
      !has('precio_venta') &&
      !has('comision')
    ) {
      throw new ValidationError('Nada que actualizar');
    }
    if (has('codigo_barras') && codigo_barras) {
      await assertBarcodesAvailable(
        [{ nombre: nombre ?? 'x', codigo_barras, precio_compra: precio_compra ?? 0 }],
        id
      );
    }
    await InventoryRepository.updatePresentation(id, {
      ...(has('nombre') ? { nombre: nombre as string } : {}),
      ...(has('codigo_barras') ? { codigo_barras: codigo_barras ?? null } : {}),
      ...(has('precio_compra') && precio_compra !== undefined ? { precio_compra } : {}),
      ...(has('precio_venta') && precio_venta !== undefined ? { precio_venta } : {}),
      ...(has('comision') && comision !== undefined ? { comision } : {})
    });
  }

  static async updatePresentationFoto(id: string, foto: string): Promise<void> {
    if (!foto || typeof foto !== 'string') {
      throw new ValidationError('Foto es requerida');
    }
    await InventoryRepository.updatePresentationFoto(id, foto);
    // Si el producto aún usa la imagen por defecto, adopta esta foto para el catálogo.
    const presentacion = await InventoryRepository.getPresentationById(id);
    if (presentacion) {
      const producto = await ProductRepository.getById(presentacion.producto_id);
      if (producto && (!producto.foto || producto.foto === 'default.png')) {
        await ProductRepository.update(presentacion.producto_id, {}, foto);
      }
    }
  }

  static async listPresentations(productoId: string) {
    return await InventoryRepository.listPresentations(productoId);
  }

  static async listPresentationsMap(productoIds: string[]) {
    return await InventoryRepository.listPresentationsByProducts(productoIds);
  }

  static async listUnits(productoId: string, presentacionId?: string) {
    return await InventoryRepository.listUnits(productoId, 1000, undefined, presentacionId);
  }

  static async listBarStock(productoId?: string) {
    return await InventoryRepository.listBarStock(productoId);
  }

  static async listForSale(filters?: { category_id?: string; term?: string }) {
    return await InventoryRepository.listForSale(filters);
  }

  static async traspasarAlBar(
    productoId: string,
    presentacionId: string,
    cantidad: unknown,
    precioVenta: unknown,
    comision: unknown,
    usuarioId?: string | null,
    opcionesVenta?: unknown
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    const cant = Number(cantidad);
    if (!Number.isInteger(cant) || cant < 1 || cant > 1000) {
      throw new ValidationError('Cantidad debe ser un número entre 1 y 1000');
    }
    const sinPrecioManual =
      opcionesVenta === undefined &&
      (precioVenta === undefined || precioVenta === null || precioVenta === '');
    const parsedOptions =
      opcionesVenta === undefined || opcionesVenta === null || opcionesVenta === ''
        ? undefined
        : SaleOptionsSchema.safeParse(opcionesVenta);
    if (parsedOptions && !parsedOptions.success) {
      throw new ValidationError(
        'Tipos de venta inválidos: indica un precio entero no negativo y una comisión opcional por tipo',
        parsedOptions.error.issues
      );
    }
    let options = parsedOptions?.success ? parsedOptions.data : undefined;
    const producto = await ProductRepository.getById(productoId);
    if (!producto) throw new NotFoundError('Producto', productoId);
    const presentaciones = await InventoryRepository.listPresentations(productoId);
    const presentacion = presentaciones.find(p => p.id === presentacionId);
    if (!presentacion) {
      throw new ValidationError('La presentación no pertenece a este producto');
    }
    // Si ya hay configuración guardada (precio, comisión), reutilizarla sin pedirla manual.
    if (!options && sinPrecioManual) {
      const guardadas = Array.isArray((presentacion as any).opciones_venta)
        ? ((presentacion as any).opciones_venta as {
            tipo: string;
            precio: unknown;
            comision: unknown;
          }[])
        : undefined;
      if (guardadas && guardadas.length > 0 && guardadas.some(o => Number(o.precio ?? 0) > 0)) {
        const reparsed = SaleOptionsSchema.safeParse(
          guardadas.map(o => ({
            tipo: o.tipo,
            precio: Number(o.precio ?? 0),
            comision: Number(o.comision ?? 0)
          }))
        );
        if (reparsed.success) options = reparsed.data;
      } else if (Number((presentacion as any).precio_venta ?? 0) > 0) {
        options = [
          {
            tipo: 'botella' as const,
            precio: Number((presentacion as any).precio_venta ?? 0),
            comision: Number((presentacion as any).comision ?? 0)
          }
        ];
      } else {
        throw new ValidationError(
          'La presentación aún no tiene precio configurado: indica precio y comisión para la primera transferencia'
        );
      }
    }
    const bottle = options?.find(option => option.tipo === 'botella');
    const pv = options ? (bottle?.precio ?? 0) : Number(precioVenta);
    if (!Number.isFinite(pv) || pv < 0) {
      throw new ValidationError('Precio de venta debe ser mayor o igual a 0');
    }
    const com = options
      ? (bottle?.comision ?? 0)
      : comision === undefined || comision === null || comision === ''
        ? 0
        : Number(comision);
    if (!Number.isFinite(com) || com < 0) {
      throw new ValidationError('Comisión debe ser mayor o igual a 0');
    }
    return await InventoryRepository.traspasarAlBarStandalone({
      producto_id: productoId,
      presentacion_id: presentacionId,
      cantidad: cant,
      precio_venta: Math.floor(pv),
      comision: Math.floor(com),
      ...(options ? { opciones_venta: options } : {}),
      usuario_id: usuarioId ?? null
    });
  }

  static async resolverTransferencia(
    transferenciaId: string,
    accion: unknown,
    usuarioId: unknown
  ): Promise<{ estado: string }> {
    if (!transferenciaId) throw new ValidationError('ID de transferencia es requerido');
    if (accion !== 'aprobar' && accion !== 'rechazar') {
      throw new ValidationError('Acción inválida: usa aprobar o rechazar');
    }
    if (!usuarioId || typeof usuarioId !== 'string') {
      throw new ValidationError('Se requiere el usuario que resuelve');
    }
    if (accion === 'aprobar') {
      await InventoryRepository.acceptTransferStandalone(transferenciaId, usuarioId);
      return { estado: 'aceptada' };
    }
    await InventoryRepository.rejectTransferStandalone(transferenciaId, usuarioId);
    return { estado: 'rechazada' };
  }

  static async listMovimientos(presentacionId: string) {
    return await InventoryRepository.listMovimientos(presentacionId);
  }

  static async listMovimientosRecientes(limit?: unknown) {
    const n = Math.floor(Number(limit));
    return await InventoryRepository.listMovimientosRecientes(
      Number.isFinite(n) && n > 0 ? Math.min(n, 500) : 100
    );
  }

  static async getChampagneTiers(productoId: string) {
    if (!productoId) throw new ValidationError('ID de producto es requerido');
    const rows = await ProductRepository.getChampagneTiers(String(productoId));
    if (rows.length > 0) return rows;
    const { CHAMPAGNE_DEFAULT_TIERS } = await import('@/lib/business/champagne');
    return CHAMPAGNE_DEFAULT_TIERS;
  }

  static async saveChampagneTiers(productoId: string, tiers: unknown) {
    if (!productoId) throw new ValidationError('ID de producto es requerido');
    const parsed = z
      .array(
        z.object({
          anfitrionas: z.preprocess(v => Number(v), z.number().int().min(1).max(10)),
          precio: z.preprocess(
            v => (v === undefined || v === null || v === '' ? 0 : Number(v)),
            z.number().int().min(0)
          ),
          comision: z.preprocess(
            v => (v === undefined || v === null || v === '' ? 0 : Number(v)),
            z.number().int().min(0)
          )
        })
      )
      .min(1, 'Se requiere al menos un tramo')
      .max(10)
      .safeParse(typeof tiers === 'string' ? JSON.parse(tiers) : tiers);
    if (!parsed.success) {
      throw new ValidationError('Tramos inválidos', parsed.error.issues);
    }
    const vistos = new Set<number>();
    for (const tier of parsed.data) {
      if (vistos.has(tier.anfitrionas)) {
        throw new ValidationError(`Tramo duplicado: ${tier.anfitrionas} anfitrionas`);
      }
      vistos.add(tier.anfitrionas);
    }
    await ProductRepository.saveChampagneTiers(String(productoId), parsed.data);
    return parsed.data;
  }

  static async setUnitsEstado(
    productoId: string,
    unidadIds: unknown,
    estado: unknown
  ): Promise<number> {
    const ids = Array.isArray(unidadIds) ? unidadIds.map(String).filter(Boolean) : [];
    if (ids.length === 0 || ids.length > 1000) {
      throw new ValidationError('Debes seleccionar entre 1 y 1000 códigos');
    }
    if (!esEstadoUnidadValido(estado)) {
      throw new ValidationError('Estado inválido');
    }
    const producto = await ProductRepository.getById(productoId);
    if (!producto) throw new NotFoundError('Producto', productoId);
    return await InventoryRepository.setUnitsEstadoStandalone(productoId, ids, estado);
  }

  static async addUnits(
    productoId: string,
    presentacionId: string,
    cantidad: number
  ): Promise<{ codigo: string; codigo_barras: string }[]> {
    const unidades = Math.floor(Number(cantidad));
    if (!Number.isFinite(unidades) || unidades < 1 || unidades > 1000) {
      throw new ValidationError('Cantidad debe ser un número entre 1 y 1000');
    }
    const producto = await ProductRepository.getById(productoId);
    if (!producto) throw new NotFoundError('Producto', productoId);
    const presentaciones = await InventoryRepository.listPresentations(productoId);
    const presentacion = presentaciones.find(p => p.id === presentacionId);
    if (!presentacion) {
      throw new ValidationError('La presentación no pertenece a este producto');
    }
    return await InventoryRepository.generateUnitsStandalone(productoId, unidades, presentacionId);
  }
}
