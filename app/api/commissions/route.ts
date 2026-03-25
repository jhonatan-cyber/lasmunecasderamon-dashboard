import { NextResponse } from 'next/server';
import { CommissionRepository } from '@/lib/repositories/CommissionRepository';

export async function GET(request: Request) {
  try {
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
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = await CommissionRepository.create(body);
    return NextResponse.json({ success: true, message: 'Comisión creada', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear comisión', error: error.message }, { status: 400 });
  }
}
