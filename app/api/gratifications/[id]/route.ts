import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { GratificacionService } from '@/modules/personal';
import { ValidationError } from '@/lib/errors/errors';
export const PUT = withRoute(
  // `edit`, no `write`: la matriz traduce create y edit a write, así que con
  // `write` el cajero (que solo tiene gratificaciones.create para solicitar)
  // podría editar montos de gratificaciones ajenas. `edit` es el mismo par que
  // usa la UI para mostrar el botón de editar.
  { auth: true, audit: true, module: 'gratificaciones', action: 'edit' },
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
