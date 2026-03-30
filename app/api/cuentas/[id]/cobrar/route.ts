import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const POST = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();
    const cobradoPor = user.id;

    // Normalizar campos del body al formato que espera el repository
    const normalizedBody = {
      metodoPago: body.metodoPago ?? body.metodo_pago,
      tipoPago: body.tipoPago ?? body.metodo_pago,
      montoFinal: body.montoFinal ?? body.total_cobrado ?? 0,
      propinaFinal: body.propinaFinal ?? body.propina ?? 0,
      habitacion_id: body.habitacion_id ?? null,
    };

    await CuentaRepository.cobrar(id, normalizedBody, cobradoPor);
    return NextResponse.json({ success: true, message: 'Cuenta cobrada exitosamente' });
  }
);
