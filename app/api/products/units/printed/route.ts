import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withRoute } from '@/lib/api/withRoute';
import { InventoryRepository } from '@/lib/repositories/InventoryRepository';

const schema = z.object({ ids: z.array(z.string().min(1).max(36)).min(1).max(1000) });

export const POST = withRoute(
  { auth: true, audit: true, module: 'products', action: 'write' },
  async (request: Request) => {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: 'Selecciona entre 1 y 1000 códigos válidos.' },
        { status: 400 }
      );
    }
    const data = await InventoryRepository.markUnitsPrinted([...new Set(parsed.data.ids)]);
    return NextResponse.json({ success: true, data });
  }
);
