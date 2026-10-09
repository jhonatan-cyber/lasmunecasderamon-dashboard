import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarCatalogoCompras } from '@/modules/inventario';

export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () => {
  const data = await listarCatalogoCompras();
  return NextResponse.json({ success: true, data });
});
