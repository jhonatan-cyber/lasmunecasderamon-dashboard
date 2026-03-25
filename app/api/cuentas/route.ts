import { NextResponse } from 'next/server';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get('tipo') || undefined;
    const estado = searchParams.get('estado') || undefined;

    const data = await CuentaRepository.getAll(tipo, estado);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener cuentas', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const createdBy = user.id;

    const id = await CuentaRepository.create(body, createdBy);
    return NextResponse.json({ success: true, message: 'Cuenta creada correctamente', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear la cuenta', error: error.message }, { status: 500 });
  }
}
