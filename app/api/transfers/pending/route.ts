import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { InventoryRepository } from '@/lib/repositories/InventoryRepository';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  return NextResponse.json({ success: true, data: await InventoryRepository.listTransfers(true) });
});
