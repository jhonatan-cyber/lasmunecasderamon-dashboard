import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { GratificacionService } from '@/modules/personal';
import { GratificacionCreateSchema } from '@/lib/business/schemas';
import { validateOrResponse } from '@/lib/api/validate';

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
    const body = await request.json();
    const validated = validateOrResponse(GratificacionCreateSchema, body);
    if (validated instanceof NextResponse) return validated;

    const role = user.role?.toLowerCase() || '';

    if (role === 'cajero') {
      const created = await GratificacionService.request(
        validated.usuario_id as string,
        validated.monto,
        validated.descripcion as string,
        // Se persiste como solicitante_id: es lo que permite al GET del cajero
        // devolver «lo suyo y lo que él solicitó» en vez del listado completo.
        user.id
      );

      return NextResponse.json(
        {
          success: true,
          pendingApproval: true,
          message: 'Solicitud de gratificación enviada al administrador por WhatsApp',
          id: created?.id || null
        },
        { status: 201 }
      );
    }

    const created = await GratificacionService.create({
      usuario_id: validated.usuario_id as string,
      monto: validated.monto,
      descripcion: validated.descripcion as string,
      solicitante_id: user.id
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Gratificación creada',
        id: created?.id || null
      },
      { status: 201 }
    );
  }
);
