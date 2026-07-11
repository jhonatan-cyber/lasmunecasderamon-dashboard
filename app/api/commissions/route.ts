import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CommissionService } from '@/lib/services/CommissionService';

export const GET = withAppApiWrapper(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const stats = searchParams.get('stats');
  const status = searchParams.get('status') || undefined;
  const employeeId = searchParams.get('employeeId') || undefined;
  const search = searchParams.get('search') || undefined;

  if (stats === 'true') {
    const data = await CommissionService.summary();
    return NextResponse.json(data);
  }

  const data = await CommissionService.list({ status, employeeId, search });
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const body = await request.json();
  const id = await CommissionService.create(body);
  return NextResponse.json({ success: true, message: 'Comisión creada', id }, { status: 201 });
});
