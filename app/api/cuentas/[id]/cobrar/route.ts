import { NextResponse } from 'next/server';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth-app';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();
    const cobradoPor = user.id;

    await CuentaRepository.cobrar(id, body, cobradoPor);
    return NextResponse.json({ success: true, message: 'Cuenta cobrada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al cobrar la cuenta', error: error.message }, { status: 500 });
  }
}
