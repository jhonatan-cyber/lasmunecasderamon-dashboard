import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { GratificacionRepository } from '@/lib/repositories/GratificacionRepository';
import { ValidationError } from '@/lib/errors/errors';

export const PUT = withAppAuth(
  async (request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    const { monto, descripcion } = await request.json();
    if (!monto) throw new ValidationError('monto es requerido', { monto });

    await GratificacionRepository.update(id, { monto, descripcion });
    return NextResponse.json({ success: true, message: 'Gratificación actualizada' });
  }
);

export const DELETE = withAppAuth(
  async (_request: Request, { params }: { params: Promise<{ id: string }>; user: any }) => {
    const id = (await params).id;
    await GratificacionRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Gratificación eliminada' });
  }
);
