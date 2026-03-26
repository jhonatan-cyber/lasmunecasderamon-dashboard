import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const stats = searchParams.get('stats');
  const status = searchParams.get('status') || undefined;
  const employeeId = searchParams.get('employeeId') || undefined;
  const search = searchParams.get('search') || undefined;

  if (stats === 'true') {
    const data = await CommissionRepository.summary();
    return NextResponse.json(data);
  }

  const data = await CommissionRepository.list({ status, employeeId, search });
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  const id = await CommissionRepository.create(body);
  return NextResponse.json({ success: true, message: 'Comisión creada', id }, { status: 201 });
});
