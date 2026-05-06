import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { PayrollRepository } from '@/lib/repositories/PayrollRepository';

export const GET = withAppApiWrapper(async () => {
  const data = await PayrollRepository.getSummary();
  return NextResponse.json({ success: true, data });
});

export const POST = withAppApiWrapper(async (request: Request) => {
  const { usuario_id } = await request.json();
  if (!usuario_id)
    return NextResponse.json(
      { success: false, message: 'usuario_id es requerido' },
      { status: 400 }
    );

  await PayrollRepository.pay(usuario_id, usuario_id);
  return NextResponse.json({ success: true, message: 'Pago procesado correctamente' });
});
