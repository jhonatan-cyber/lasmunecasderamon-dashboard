import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { GratificacionService } from '@/lib/services/GratificacionService';
import { ValidationError } from '@/lib/errors/errors';
export const PUT = withRoute(
  { auth: true, audit: true, module: 'gratificaciones', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const { monto, descripcion } = await request.json();
    if (!monto) throw new ValidationError('monto es requerido', { monto });

    await GratificacionService.update(id, { monto, descripcion });
    return NextResponse.json({ success: true, message: 'Gratificación actualizada' });
  }
);
export const DELETE = withRoute(
  { auth: true, audit: true, module: 'gratificaciones', action: 'delete' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await GratificacionService.delete(id);
    return NextResponse.json({ success: true, message: 'Gratificación eliminada' });
  }
);
