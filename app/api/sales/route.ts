import { NextResponse } from 'next/server';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      tipo: searchParams.get('tipo') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '10',
      estado: searchParams.get('estado') || undefined,
      caja_id: searchParams.get('caja_id') || undefined,
      search: searchParams.get('search') || undefined
    };

    const data = await SaleRepository.getAll(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'Usuario no autenticado' }, { status: 401 });

    const body = await request.json();
    const createdBy = user.id;

    const result = await SaleRepository.create(body, createdBy);

    return NextResponse.json({ success: true, message: 'Venta procesada', ...result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 400 });
  }
}
