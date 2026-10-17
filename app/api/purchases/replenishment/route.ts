import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { revisarReposicion } from '@/modules/inventario/reposicion/servicio';
export const GET = withRoute({ auth: true, module: 'products', action: 'read' }, async () =>
  NextResponse.json({ success: true, data: await revisarReposicion() })
);
