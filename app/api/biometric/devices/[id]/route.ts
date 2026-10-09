import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { revokeBiometricDevice } from '@/modules/asistencia';

export const dynamic = 'force-dynamic';

export const DELETE = withRoute(
  { auth: true, access: 'administrator', audit: true },
  async (_request: Request, { params }: { params: any }) => {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, message: 'El ID es requerido', code: 'VALIDATION' },
        { status: 400 }
      );
    }
    await revokeBiometricDevice(String(id));
    return NextResponse.json({ success: true, message: 'Equipo desvinculado.' });
  }
);
