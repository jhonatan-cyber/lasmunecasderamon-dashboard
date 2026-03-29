import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { UserRepository } from '@/lib/repositories/UserRepository';

// GET sin verificación de permisos - solo requiere autenticación
export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const user = await getAuth();
    if (!user) {
      return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
    }

    const id = (await params).id;
    const data = await UserRepository.getById(id);
    if (!data)
      return NextResponse.json(
        { success: false, message: 'Usuario no encontrado' },
        { status: 404 }
      );
    return NextResponse.json({ success: true, user: data });
  }
);

export const PUT = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const body = await request.json();
    await UserRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Usuario actualizado' });
  }
);

export const DELETE = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    await UserRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  }
);
