import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { AccountService } from '@/lib/services/AccountService';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const estado = searchParams.get('estado') || undefined;

  const data = await CuentaRepository.getAll(tipo, estado);
  return NextResponse.json(data);
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const id = await AccountService.createAccountMovement(body, user.id.toString());

  return NextResponse.json(
    { success: true, message: 'Cuenta creada correctamente', id },
    { status: 201 }
  );
});
