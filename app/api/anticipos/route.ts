import { NextResponse } from 'next/server';
import { AnticipoRepository } from '@/lib/repositories/AnticipoRepository';
import { getAuth } from '@/lib/auth-app';

export async function GET() {
  try {
    const data = await AnticipoRepository.getAll();
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
    const { action, usuario_id, monto, motivo } = body;

    if (action === "solicitar") {
        const id = await AnticipoRepository.request(userAuth.id, monto, motivo || '');
        return NextResponse.json({ success: true, message: 'Solicitud enviada', anticipo_id: id }, { status: 201 });
    }

    if (!usuario_id || !monto || isNaN(Number(monto))) {
      return NextResponse.json({ success: false, message: 'usuario_id y monto son requeridos' }, { status: 400 });
    }

    const result = await AnticipoRepository.grant(usuario_id, Number(monto));
    return NextResponse.json({ success: true, message: 'Anticipo otorgado correctamente', ...result }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message || 'Error al procesar el anticipo' }, { status: 400 });
  }
}
