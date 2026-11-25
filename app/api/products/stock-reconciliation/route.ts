import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { ValidationError } from '@/lib/errors/errors';
import { listarConciliacionStock, reclasificarStockPendiente } from '@/modules/inventario';

const ReclasificarStockSchema = z.object({
  productoId: z.string().min(1).max(64),
  presentacionOrigenId: z.string().min(1).max(64),
  presentacionDestinoId: z.string().min(1).max(64),
  codigosUnidades: z
    .array(z.string().trim().min(1).max(64))
    .min(1)
    .max(200)
    .refine(codigos => new Set(codigos).size === codigos.length, 'Los códigos deben ser únicos')
});

export const GET = withRoute(
  { auth: true, audit: true, module: 'products', action: 'read' },
  async () => {
    const data = await listarConciliacionStock();
    return NextResponse.json({ success: true, data });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const parsed = ReclasificarStockSchema.safeParse(await request.json());
    if (!parsed.success) {
      throw new ValidationError('Datos de conciliación inválidos', parsed.error.issues);
    }

    const unidadesActualizadas = await reclasificarStockPendiente(parsed.data);
    return NextResponse.json({ success: true, data: { unidadesActualizadas } });
  }
);
