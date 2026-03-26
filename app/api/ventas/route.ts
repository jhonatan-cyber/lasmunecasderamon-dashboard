import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { SaleService } from '@/lib/services/SaleService';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
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
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const result = await SaleService.createSale(body, user.id.toString());
  return NextResponse.json({ success: true, ...result });
});
