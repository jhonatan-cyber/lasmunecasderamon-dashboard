import { NextResponse } from 'next/server';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const resumen = searchParams.get('resumen');

    if (resumen === '1') {
      const data = await CashRegisterRepository.summary();
      return NextResponse.json({ success: true, data });
    }

    const data = await CashRegisterRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al obtener cajas', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const id = await CashRegisterRepository.open(body.usuario_id_apertura, body.monto_apertura);
    return NextResponse.json({ success: true, message: 'Caja abierta', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error al abrir caja' }, { status: 400 });
  }
}

export async function PUT(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ success: false, message: 'ID requerido' }, { status: 400 });

    await CashRegisterRepository.update(id, data);
    return NextResponse.json({ success: true, message: 'Caja actualizada' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar caja', error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const userAuth = await getAuth();
    if (!userAuth) return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    await CashRegisterRepository.close(body.id_caja, body.usuario_id_cierre);
    return NextResponse.json({ success: true, message: 'Caja cerrada exitosamente' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error al cerrar caja' }, { status: 400 });
  }
}
