import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { CuentaRepository } from '@/lib/repositories/CuentaRepository';

export const PATCH = withAppAuth(
  async (_request: Request, { params, user }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const data = await CuentaRepository.stopTimer(id, user.id.toString());
    return NextResponse.json({ success: true, message: 'Temporizador finalizado', data });
  }
);
