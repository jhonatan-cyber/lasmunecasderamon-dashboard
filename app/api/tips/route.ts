import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { TipService } from '@/lib/services/TipService';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute({ auth: true, audit: true }, async (request: Request, { user }: { params: any; user: any }) => {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');
  const usuario_id = searchParams.get('usuario_id');
  const caja_activa = searchParams.get('caja_activa') === '1';
  const isAdmin = user.role?.toLowerCase() === 'administrador';

  if (tipo === 'resumen') {
    const data = await TipService.getSummary(isAdmin, user.id, caja_activa);
    return NextResponse.json({ success: true, data });
  } else if (tipo === 'detalle') {
    const targetUserId = isAdmin && usuario_id ? usuario_id : user.id;
    const data = await TipService.getDetails(targetUserId);
    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ success: false, message: 'Tipo inválido' }, { status: 400 });
});

export const POST = withRoute({ auth: true, audit: true }, async (request: Request) => {
  const { venta_id, monto } = await request.json();
  if (!venta_id || !monto || monto <= 0)
    throw new ValidationError('Venta ID y monto son requeridos', { venta_id, monto });

  const result = await TipService.register({ venta_id, monto });
  return NextResponse.json(
    { success: true, message: 'Propina registrada y distribuida correctamente', data: result },
    { status: 201 }
  );
});
