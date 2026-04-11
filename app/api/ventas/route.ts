import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { SaleService } from '@/lib/services/SaleService';

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

export const POST = withAppAuth(async (request: Request, { user }) => {
  const body = await request.json();
  const result = await SaleService.createSale(body, user.id.toString());
  return NextResponse.json({ success: true, ...result });
});
