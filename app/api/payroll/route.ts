import { NextResponse } from 'next/server';
import { PayrollRepository } from '@/lib/repositories/PayrollRepository';

export async function GET() {
  try {
    const data = await PayrollRepository.getSummary();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener planilla', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { usuario_id } = await request.json();
    if (!usuario_id) return NextResponse.json({ success: false, message: 'usuario_id es requerido' }, { status: 400 });

    await PayrollRepository.pay(usuario_id);
    return NextResponse.json({ success: true, message: 'Pago procesado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al procesar el pago', error: error.message }, { status: 500 });
  }
}
