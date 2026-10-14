import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { listarSolicitudesDeUsuario, solicitarAnticipoSimple } from '@/modules/personal';
import { AnticipoRequestSchema } from '@/lib/business/schemas/anticipo';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const solicitudes = await listarSolicitudesDeUsuario(user.id.toString());
    return NextResponse.json({ success: true, data: solicitudes });
  }
);

export const POST = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
    const { monto, motivo } = AnticipoRequestSchema.parse(await request.json());

    const result = await solicitarAnticipoSimple(user.id.toString(), Number(monto), motivo);
    return NextResponse.json(
      { success: true, message: 'Solicitud enviada', data: result },
      { status: 201 }
    );
  }
);
