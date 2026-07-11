import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AccountService } from '@/lib/services/AccountService';

export const POST = withAppAuth(
  async (request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const body = await request.json();

    const normalizedBody = {
      metodoPago: body.metodoPago ?? body.metodo_pago,
      tipoPago: body.tipoPago ?? body.metodo_pago,
      montoFinal: body.montoFinal ?? body.total_cobrado ?? 0,
      propinaFinal: body.propinaFinal ?? body.propina ?? 0,
      habitacion_id: body.habitacion_id ?? null
    };

    await AccountService.cobrar(id, normalizedBody, user.id);
    return NextResponse.json({ success: true, message: 'Cuenta cobrada exitosamente' });
  }
);
