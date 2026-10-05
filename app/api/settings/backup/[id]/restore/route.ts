import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { restaurarRespaldo } from '@/modules/configuracion';

export const POST = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;

    const resultado = await restaurarRespaldo(id);

    if (!resultado.encontrado)
      return NextResponse.json({ success: false, error: 'Backup no encontrado' }, { status: 404 });

    if (!resultado.conDatos)
      return NextResponse.json(
        { success: false, error: 'El backup no tiene datos para restaurar' },
        { status: 400 }
      );

    return NextResponse.json({
      success: true,
      message: 'Backup restaurado correctamente',
      restored: resultado.restored
    });
  }
);
