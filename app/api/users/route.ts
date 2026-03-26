import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { UserService } from '@/lib/services/UserService';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

export const GET = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const anfitrionas = searchParams.get('anfitrionas');
    const data = await UserRepository.getAll(anfitrionas || undefined);
    return NextResponse.json({ success: true, data });
  },
  { module: 'users', action: 'read' }
);

export const POST = withAppAuth(
  async (request: Request) => {
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let fotoFilename = 'default.png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      const foto = formData.get('foto') as File | null;
      if (foto && foto.size > 0) {
        const buffer = Buffer.from(await foto.arrayBuffer());
        const filename = `user_${Date.now()}${path.extname(foto.name)}`;
        const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');

        if (!existsSync(uploadDir)) {
          await fs.mkdir(uploadDir, { recursive: true });
        }

        await fs.writeFile(path.join(uploadDir, filename), buffer);
        fotoFilename = filename;
      }
    } else {
      body = await request.json();
    }

    const data = await UserService.createUser(body, fotoFilename);
    return NextResponse.json({ success: true, message: 'Usuario creado', data }, { status: 201 });
  },
  { module: 'users', action: 'write' }
);

export const PATCH = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id || !action) {
      return NextResponse.json(
        { success: false, message: 'ID y acción son requeridos' },
        { status: 400 }
      );
    }

    const data = await UserService.toggleUserStatus(id, action);
    return NextResponse.json({
      success: true,
      message: `Estado del usuario actualizado correctamente`,
      data
    });
  },
  { module: 'users', action: 'write' }
);

export const PUT = withAppAuth(
  async (request: Request) => {
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

    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    const data = await UserService.updateUser(id, body);
    return NextResponse.json({ success: true, message: 'Usuario actualizado', data });
  },
  { module: 'users', action: 'write' }
);

export const DELETE = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    await UserRepository.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  },
  { module: 'users', action: 'delete' }
);
