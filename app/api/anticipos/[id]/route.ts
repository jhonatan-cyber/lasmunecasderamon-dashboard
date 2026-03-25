import { NextResponse } from 'next/server';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { getAuth } from '@/lib/auth-app';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const { estado } = await request.json();
    
    if (!id) return NextResponse.json({ success: false, message: 'id_anticipo es requerido' }, { status: 400 });

    await AnticipoRepository.update(id, estado ?? 0);
    return NextResponse.json({ success: true, message: 'Anticipo actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar el anticipo', error: error.message }, { status: 500 });
  }
}
