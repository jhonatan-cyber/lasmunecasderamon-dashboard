import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const PATCH = withAppApiWrapper(
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const id = (await params).id;
    const data = await CuentaRepository.stopTimer(id, user.id.toString());
    return NextResponse.json({ success: true, message: 'Temporizador finalizado', data });
  }
);
