import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api/withRoute';
import { EventService } from '@/lib/services/EventService';

export const dynamic = 'force-dynamic';

export const GET = withPublicRoute(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
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
