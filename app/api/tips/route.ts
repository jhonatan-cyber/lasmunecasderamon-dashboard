import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { TipRepository } from '@/lib/repositories/TipRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const userAuth = await getAuth();
  if (!userAuth)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');
  const usuario_id = searchParams.get('usuario_id');
  const caja_activa = searchParams.get('caja_activa') === '1';

  const isAdmin = userAuth.role === 'administrador';

  if (tipo === 'resumen') {
    const data = await TipRepository.getSummary(isAdmin, userAuth.id, caja_activa);
    return NextResponse.json({ success: true, data });
  } else if (tipo === 'detalle') {
    const targetUserId = isAdmin && usuario_id ? usuario_id : userAuth.id;
    const data = await TipRepository.getDetails(targetUserId);
    return NextResponse.json({ success: true, data });
  }

  return NextResponse.json({ success: false, message: 'Tipo inválido' }, { status: 400 });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const userAuth = await getAuth();
  if (!userAuth)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const { venta_id, monto } = await request.json();
  if (!venta_id || !monto || monto <= 0)
    return NextResponse.json(
      { success: false, message: 'Venta ID y monto son requeridos' },
      { status: 400 }
    );

  const result = await TipRepository.register({ venta_id, monto });
  return NextResponse.json(
    { success: true, message: 'Propina registrada y distribuida correctamente', data: result },
    { status: 201 }
  );
});
