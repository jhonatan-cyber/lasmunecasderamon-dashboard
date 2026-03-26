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

    await AnticipoRepository.updateStatus(id, estado ?? 0);
    return NextResponse.json({ success: true, message: 'Anticipo actualizado correctamente' });
  }
);
