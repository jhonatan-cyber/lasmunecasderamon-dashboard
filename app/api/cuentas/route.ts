import { NextResponse } from 'next/server';
import { withPublicRoute, withRoute } from '@/lib/api/withRoute';
import { AccountService } from '@/lib/services/AccountService';

export const GET = withPublicRoute(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const data = await AccountService.getAll(tipo, estado);
  return NextResponse.json({ success: true, data });
});

export const POST = withRoute(
  { auth: true, audit: true, module: 'finances', action: 'write' },
  async (request: Request, { params, user }) => {
    const body = await request.json();
    const cuenta = await AccountService.create(body, user.id.toString());
    return NextResponse.json(
      { success: true, message: 'Cuenta creada correctamente', id: cuenta?.id_cuenta },
      { status: 201 }
    );
  }
);
