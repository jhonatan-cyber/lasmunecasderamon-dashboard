import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { SaleRepository } from '@/lib/repositories/SaleRepository';
import { SaleService } from '@/lib/services/SaleService';

export const GET = withAppApiWrapper(async (request: Request) => {
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
});

export const POST = withAppAuth(async (request: Request, { user }: { params: any; user: any }) => {
  const body = await request.json();
  const result = await SaleService.createSale(body, user.id.toString());
  return NextResponse.json(
    { success: true, message: 'Venta procesada', ...result },
    { status: 201 }
  );
});
