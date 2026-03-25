import { NextResponse } from 'next/server';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const params = {
      tipo: searchParams.get('tipo') || undefined,
      estado: searchParams.get('estado') || undefined,
      caja_id: searchParams.get('caja_id') || undefined,
      limit: searchParams.get('limit') || undefined,
      page: searchParams.get('page') || undefined
    };
    const data = await SaleRepository.getAll(params);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error getting sales', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuth();
    if (!user) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const result = await SaleRepository.create(body, user.id.toString());
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error creating sale' }, { status: 400 });
  }
}
