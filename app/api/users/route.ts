import { NextResponse } from 'next/server';
import { UserRepository } from '@/lib/repositories/UserRepository';

export async function GET() {
  try {
    const data = await UserRepository.getAll();
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error at list users', error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let fotoFilename = 'default.png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      const foto = formData.get('foto') as File | null;
      if (foto && foto.size > 0) {
        // Here we would normally save the file and get the filename
        // For now, we'll assume the repository or a utility handles it if we pass the file
        // Or we use a placeholder if the integration is not yet complete
        // But the Repository.create expects a filename
      }
    } else {
      body = await request.json();
    }

    const id = await UserRepository.create(body, fotoFilename);
    return NextResponse.json({ success: true, message: 'Usuario creado', id }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al crear usuario', error: error.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id || !action) {
      return NextResponse.json({ success: false, message: 'ID y acción son requeridos' }, { status: 400 });
    }

    await UserRepository.updateStatus(id, action);
    return NextResponse.json({ success: true, message: `Estado del usuario actualizado correctamente a ${action === 'activate' ? 'activo' : 'inactivo'}` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar el estado del usuario', error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let id: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = formData.get('id') as string;
      body = Object.fromEntries(formData.entries());
    } else {
      const jsonBody = await request.json();
      id = jsonBody.id;
      body = jsonBody;
    }

    if (!id) return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });
    
    await UserRepository.update(id, body);
    return NextResponse.json({ success: true, message: 'Usuario actualizado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al actualizar usuario', error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });
    
    await UserRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: 'Error al eliminar usuario', error: error.message }, { status: 500 });
  }
}
