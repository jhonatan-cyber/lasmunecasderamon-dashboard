import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { configurarRecepcionBiometrica, recepcionAutomaticaHabilitada } from '@/modules/asistencia';
import { guardarClave } from '@/modules/configuracion';

export const dynamic = 'force-dynamic';

export const GET = withRoute({ auth: true, access: 'administrator' }, async () => {
  const habilitado = await recepcionAutomaticaHabilitada();
  // También reconcilia procesos que ya estaban corriendo en el servidor durante HMR.
  await configurarRecepcionBiometrica(habilitado);
  return NextResponse.json(
    { success: true, data: { habilitado } },
    { headers: { 'Cache-Control': 'no-store' } }
  );
});

export const PUT = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (request: Request) => {
    const body = await request.json();
    if (typeof body?.habilitado !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'El estado de recepción debe ser booleano.' },
        { status: 400 }
      );
    }

    const habilitado = body.habilitado as boolean;
    const error = await guardarClave('biometric_recepcion_activa', String(habilitado));
    if (error) {
      return NextResponse.json({ success: false, message: error }, { status: 400 });
    }

    await configurarRecepcionBiometrica(habilitado);
    return NextResponse.json({
      success: true,
      data: { habilitado },
      message: habilitado
        ? 'Recepción automática del lector activada.'
        : 'Recepción automática del lector pausada.'
    });
  }
);
