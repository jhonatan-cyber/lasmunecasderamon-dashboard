import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { EventService } from '@/modules/agenda';
import { isAdministrator, type AuthenticatedUser } from '@/lib/middleware/auth';

export const dynamic = 'force-dynamic';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (
    request: Request,
    { params, user }: { params: Promise<{ id: string }>; user: AuthenticatedUser }
  ) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Tipo de evento requerido' },
        { status: 400 }
      );
    }

    try {
      if (!isAdministrator(user) && !(await EventService.canReadEvent(id, type, String(user.id)))) {
        return NextResponse.json(
          { success: false, message: 'Evento no encontrado' },
          { status: 404 }
        );
      }
      const data = await EventService.getEventDetail(id, type);
      return NextResponse.json({ success: true, data });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, message: error.message || 'Error al obtener el detalle del evento' },
        { status: 400 }
      );
    }
  }
);
