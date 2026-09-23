import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { GratificacionService } from '@/lib/services/GratificacionService';
import { ValidationError } from '@/lib/errors/errors';

// GET: el handler ya limita a datos propios salvo para administrador/cajero.
export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const role = user.role?.toLowerCase() || '';
    const isPrivileged = role === 'administrador' || role === 'cajero';
    const targetUserId = isPrivileged ? userId || undefined : user.id;

    const data = await GratificacionService.getAll(targetUserId);
    return NextResponse.json(data);
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'gratificaciones', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { usuario_id, monto, descripcion } = await request.json();
    if (!usuario_id || !monto) {
      throw new ValidationError('usuario_id y monto son requeridos', { usuario_id, monto });
    }

    const role = user.role?.toLowerCase() || '';

    if (role === 'cajero') {
      const created = await GratificacionService.request(
        usuario_id,
        Number(monto),
        descripcion,
        user.id
      );

      return NextResponse.json(
        {
          success: true,
          pendingApproval: true,
          message: 'Solicitud de gratificaci?n enviada al administrador por WhatsApp',
          id: created?.id || null
        },
        { status: 201 }
      );
    }

    const created = await GratificacionService.create({
      usuario_id,
      monto: Number(monto),
      descripcion
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Gratificaci?n creada',
        id: created?.id || null
      },
      { status: 201 }
    );
  }
);
