import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { ServiceRepository } from '@/lib/repositories/ServiceRepository';
import { ServiceService } from '@/lib/services/ServiceService';
import { getAuth } from '@/lib/auth/auth-app';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const params = {
    all: searchParams.get('all') || undefined,
    caja_id: searchParams.get('caja_id') || undefined,
    limit: searchParams.get('limit') || undefined,
    page: searchParams.get('page') || undefined
  };
  const data = await ServiceRepository.getAll(params);
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user)
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

  const body = await request.json();
  const result = await ServiceService.createService(body, user.id.toString());
  return NextResponse.json({ success: true, ...result });
});
