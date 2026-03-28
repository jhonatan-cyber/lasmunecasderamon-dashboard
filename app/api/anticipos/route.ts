import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { AnticipoService } from '@/lib/services/AnticipoService';

export const GET = withAppAuth(
  async () => {
    const data = await AnticipoRepository.getAll();
    return NextResponse.json({ success: true, data });
  },
  { module: 'finances', action: 'read' }
);

export const POST = withAppAuth(
  async (request: Request, { user }) => {
    const body = await request.json();
    const { action, usuario_id, monto, device_date } = body;

    if (action === 'solicitar') {
      const id = await AnticipoService.requestAnticipo(user.id.toString(), body);
      return NextResponse.json(
        { success: true, message: 'Solicitud enviada', anticipo_id: id },
        { status: 201 }
      );
    }

    if (!usuario_id || !monto || isNaN(Number(monto))) {
      return NextResponse.json(
        { success: false, message: 'usuario_id y monto son requeridos' },
        { status: 400 }
      );
    }

    const { motivo } = body;
    try {
      const result = await AnticipoService.grantAnticipo(usuario_id, Number(monto), motivo, device_date);
      return NextResponse.json(
        { success: true, message: 'Anticipo otorgado correctamente', ...result },
        { status: 201 }
      );
    } catch (error: any) {
      console.error('Error granting advance:', error);
      return NextResponse.json(
        { success: false, message: error.message || 'Error al otorgar anticipo' },
        { status: 400 }
      );
    }
  },
  { module: 'finances', action: 'write' }
);
