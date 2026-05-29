import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { ValidationError } from '@/lib/errors/errors';

export const PUT = withAppAuth(
  async (request: Request, context: { params: Promise<{ id: string }>; user: any }) => {
    const { id } = await context.params;
    const { estado, entregado_por } = await request.json();
    const { user } = context;

    if (Number(estado) === 1) {
      await AnticipoRepository.processSolicitud(id, 'approve', user.id.toString());
    } else if (Number(estado) === 3) {
      await AnticipoRepository.processSolicitud(id, 'reject', user.id.toString());
    } else if (Number(estado) === 0) {
      await AnticipoRepository.deliverAnticipo(id, user.id.toString());
    } else {
      await AnticipoRepository.updateStatus(id, Number(estado ?? 0), user.id.toString());
    }

    return NextResponse.json({ success: true, message: 'Anticipo procesado correctamente' });
  },
  { requiredPermission: { module: 'advances', action: 'process' } }
);
