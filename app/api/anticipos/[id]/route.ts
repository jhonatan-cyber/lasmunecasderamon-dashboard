import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { getAuth } from '@/lib/auth/auth-app';

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const userAuth = await getAuth();
    if (!userAuth)
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { estado } = await request.json();

    if (!id)
      return NextResponse.json(
        { success: false, message: 'id_anticipo es requerido' },
        { status: 400 }
      );

    if (Number(estado) === 1) {
      await AnticipoRepository.processSolicitud(id, 'approve');
    } else if (Number(estado) === 3) {
      await AnticipoRepository.processSolicitud(id, 'reject');
    } else if (Number(estado) === 0) {
      await AnticipoRepository.deliverAnticipo(id);
    } else {
      await AnticipoRepository.updateStatus(id, Number(estado ?? 0));
    }

    return NextResponse.json({ success: true, message: 'Anticipo procesado correctamente' });
  }
);
