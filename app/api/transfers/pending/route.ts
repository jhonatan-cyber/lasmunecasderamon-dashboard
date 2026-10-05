import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarTransferencias } from '@/modules/inventario';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  return NextResponse.json({ success: true, data: await listarTransferencias(true) });
});
