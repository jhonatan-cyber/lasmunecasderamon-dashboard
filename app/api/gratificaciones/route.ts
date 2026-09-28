import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { GratificacionService } from '@/lib/services/GratificacionService';
import { ValidationError } from '@/lib/errors/errors';

// GET: el filtrado vive en el handler. Solo el administrador consulta listados
// ajenos (con ?userId= o el completo); el resto —incluido el cajero— ve lo suyo
// y lo que él mismo solicitó (solicitante_id, migración 037). El prefijo sigue
// sin gate en el middleware: esa decisión está documentada en
// API_ROUTE_PERMISSIONS.
export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isAdmin = (user.role?.toLowerCase() || '') === 'administrador';

    const data = isAdmin
      ? await GratificacionService.getAll(userId || undefined)
      : await GratificacionService.getAll(user.id, user.id);

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
        // Se persiste como solicitante_id: es lo que permite al GET del cajero
        // devolver «lo suyo y lo que él solicitó» en vez del listado completo.
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
      descripcion,
      solicitante_id: user.id
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
