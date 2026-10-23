import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { reordenarStockBar } from '@/modules/inventario';

// Reordenar el listado del bar es una edición del catálogo que ve el bar: mismo
// guard que el traspaso de stock.
const ReorderSchema = z.object({
  presentation_orders: z
    .array(
      z.object({
        id: z.string().min(1).max(36),
        orden: z.number().int().min(1)
      })
    )
    .min(1)
    .max(5000)
});

export const PUT = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const { presentation_orders } = ReorderSchema.parse(await request.json());

    await reordenarStockBar(presentation_orders);

    return NextResponse.json({
      success: true,
      message: 'Orden del bar actualizado correctamente'
    });
  }
);
