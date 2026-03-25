import { NextResponse } from 'next/server';
import { ClientRepository } from '@/lib/repositories/ClientRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const data = await ClientRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { run = '', name, lastName, phone = '' } = body;
    if (!name || !lastName) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    const id = await ClientRepository.create({ run, name, lastName, phone });
    return NextResponse.json({ success: true, message: 'Cliente creado correctamente', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    // Si no hay ID en la URL, buscamos en el body
    const targetId = id || body.id;

    if (!targetId || !body.name || !body.lastName) {
      return NextResponse.json({ success: false, message: 'Faltan parámetros requeridos' }, { status: 400 });
    }

    await ClientRepository.update(targetId, body);
    return NextResponse.json({ success: true, message: 'Cliente actualizado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });
    }

    await ClientRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Cliente eliminado correctamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error interno del servidor', error: error.message }, { status: 500 });
  }
}
