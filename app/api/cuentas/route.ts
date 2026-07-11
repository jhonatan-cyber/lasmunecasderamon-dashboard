import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { AccountService } from '@/lib/services/AccountService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo') || undefined;
  const estado = searchParams.get('estado') || undefined;
  const data = await AccountService.getAll(tipo, estado);
  return NextResponse.json(data);
});

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const body = await request.json();
  const id = await AccountService.createAccountMovement(body, user.id.toString());
  return NextResponse.json(
    { success: true, message: 'Cuenta creada correctamente', id },
    { status: 201 }
  );
});
