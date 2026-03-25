import { NextResponse } from 'next/server';
import { ErrorLogRepository } from '@/lib/repositories/ErrorLogRepository';

export async function GET() {
  try {
    const data = await ErrorLogRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener logs', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await ErrorLogRepository.log(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al guardar log', error: error.message }, { status: 500 });
  }
}
