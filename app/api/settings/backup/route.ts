import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { crearRespaldo, listarRespaldos } from '@/modules/configuracion';

export const POST = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const { nombre, descripcion } = body;

    const backup = await crearRespaldo({ nombre, descripcion, usuarioNick: user.nick });

    return NextResponse.json({
      success: true,
      message: 'Backup creado correctamente',
      backup
    });
  }
);

export const GET = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'read' },
  async () => {
    return NextResponse.json({ success: true, backups: await listarRespaldos() });
  }
);
