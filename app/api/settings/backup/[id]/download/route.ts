import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { obtenerRespaldoParaDescarga } from '@/modules/configuracion';

export const GET = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'read' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;

    const backup = await obtenerRespaldoParaDescarga(id);

    if (!backup)
      return NextResponse.json({ success: false, error: 'Backup no encontrado' }, { status: 404 });

    if (!backup.json_data)
      return NextResponse.json(
        { success: false, error: 'El backup no tiene datos para descargar' },
        { status: 400 }
      );

    const timestamp = new Date(backup.fecha_crea).toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `backup_${backup.nombre}_${timestamp}.json`;

    return new NextResponse(backup.json_data, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  }
);
