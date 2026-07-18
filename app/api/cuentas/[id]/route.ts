import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { AccountService } from '@/lib/services/AccountService';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const data = await AccountService.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Cuenta no encontrada' },
        { status: 404 }
      );
    return NextResponse.json(data);
  }
);

export const PUT = withRoute({ auth: true, audit: true, module: 'finances', action: 'write' }, async (request: Request, { params, user }) => {
  const id = (await params).id;
  const body = await request.json();
  const cuentaActualizada = await AccountService.updateCuenta(id, body, user.id);
  return NextResponse.json({
    success: true,
    message: 'Cuenta actualizada correctamente',
    data: cuentaActualizada
  });
});

export const DELETE = withRoute({ auth: true, audit: true, module: 'finances', action: 'delete' }, async (_request: Request, { params }) => {
  const id = (await params).id;
  await AccountService.delete(id);
  return NextResponse.json({ success: true, message: 'Cuenta eliminada exitosamente' });
});
