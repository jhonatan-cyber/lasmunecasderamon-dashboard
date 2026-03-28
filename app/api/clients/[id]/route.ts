import { NextResponse } from 'next/server';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { getAuth } from '@/lib/auth/auth-app';
import { jsonWithNormalizedDates } from '@/lib/api/date-response';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const id = (await params).id;
    const client = await ClientRepository.getById(id);
    if (!client) return NextResponse.json({ message: 'Cliente no encontrado' }, { status: 404 });
    return jsonWithNormalizedDates(client);
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    const body = await request.json();
    const { run, name, lastName, phone } = body;

    // Si el ID viene en el body lo usamos, sino el de la URL
    const targetId = id || body.id;
    if (!targetId || !name || !lastName) {
      return NextResponse.json({ message: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    await ClientRepository.update(targetId, { run, name, lastName, phone });
    return NextResponse.json({ message: 'Cliente actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Error interno del servidor', error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ message: 'No autorizado' }, { status: 401 });

    const id = (await params).id;
    if (!id) return NextResponse.json({ message: 'ID de cliente no válido' }, { status: 400 });

    await ClientRepository.delete(id);
    return NextResponse.json({ message: 'Cliente eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Error al eliminar el cliente', error: error.message },
      { status: 500 }
    );
  }
}
