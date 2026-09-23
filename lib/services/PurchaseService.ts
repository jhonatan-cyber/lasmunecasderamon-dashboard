import { withTransaction } from '@/lib/database/db';
import { BaseRepository } from '@/lib/repositories/BaseRepository';
import { PurchaseRepository } from '@/lib/repositories/PurchaseRepository';
import { ProductRepository } from '@/lib/repositories/ProductRepository';
import { InventoryRepository } from '@/lib/repositories/InventoryRepository';
import { ValidationError, NotFoundError } from '@/lib/errors/errors';
import { z } from 'zod';
import type { PurchaseCreate } from '@/types/purchase';

const DetalleSchema = z.object({
  producto_id: z.string().min(1, 'producto_id es requerido'),
  presentacion_id: z.string().min(1, 'presentacion_id es requerida'),
  cantidad: z.preprocess(
    v => Number(v),
    z.number().int().min(1, 'Cantidad debe estar entre 1 y 1000').max(1000)
  ),
  precio_compra: z.preprocess(
    v => (v === undefined || v === null || v === '' ? 0 : Number(v)),
    z.number().int().min(0, 'El precio de compra no puede ser negativo').max(2147483647)
  )
});

const CompraSchema = z.object({
  detalles: z.array(DetalleSchema).min(1, 'Agrega al menos un ítem').max(100),
  proveedor: z.string().max(120).nullish(),
  telefono: z.string().max(30).nullish(),
  observaciones: z.string().max(500).nullish()
});

export class PurchaseService {
  static async registrarCompra(input: PurchaseCreate, usuarioId?: string | null) {
    const parsed = CompraSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(
        'Compra inválida: revisa cantidades y precios',
        parsed.error.issues
      );
    }
    if (!usuarioId) throw new ValidationError('Se requiere el usuario que registra la compra');

    const detalles = parsed.data.detalles.map(d => ({
      ...d,
      subtotal: d.cantidad * d.precio_compra
    }));
    const total = detalles.reduce((acc, d) => acc + d.subtotal, 0);

    let compra!: Awaited<ReturnType<typeof PurchaseRepository.create>>;
    await withTransaction(async trx => {
      // Valida pertenencia antes de mover stock.
      const productoIds = [...new Set(detalles.map(d => d.producto_id))];
      for (const pid of productoIds) {
        const producto = await ProductRepository.getById(pid);
        if (!producto) throw new NotFoundError('Producto', pid);
        const presentaciones = await InventoryRepository.listPresentations(pid, trx);
        const validas = new Set(presentaciones.map(p => String(p.id)));
        for (const d of detalles.filter(x => x.producto_id === pid)) {
          if (!validas.has(String(d.presentacion_id))) {
            throw new ValidationError('La presentación no pertenece a este producto');
          }
        }
      }

      compra = await PurchaseRepository.create(
        trx,
        {
          total,
          proveedor: parsed.data.proveedor ?? null,
          telefono: parsed.data.telefono ?? null,
          observaciones: parsed.data.observaciones ?? null,
          usuario_id: usuarioId
        },
        detalles
      );

      for (const d of detalles) {
        await InventoryRepository.generateUnits(
          trx,
          d.producto_id,
          d.cantidad,
          d.presentacion_id,
          compra.id
        );
        await InventoryRepository.syncStockTotal(trx, d.producto_id);
        // Último costo conocido por presentación (misma transacción).
        await BaseRepository.update(trx, 'inventario_presentaciones', 'id', d.presentacion_id, {
          precio_compra: d.precio_compra
        });
      }
    });

    return compra;
  }

  static async listar(limit?: unknown) {
    const n = Number(limit);
    return await PurchaseRepository.list(
      Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), 500) : 100
    );
  }
}
