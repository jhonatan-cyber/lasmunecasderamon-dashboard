import { NextResponse } from 'next/server';
import { withAppApiWrapper, withAppAuth } from '@/lib/api/app-api-wrapper';
import { getAuth } from '@/lib/auth/auth-app';
import { UserRepository } from '@/lib/repositories/UserRepository';
import { UserService } from '@/lib/services/UserService';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import sharp from 'sharp';
import logger from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

// GET sin verificación de permisos - solo requiere autenticación
export const GET = withAppApiWrapper(async (request: Request) => {
  const user = await getAuth();
  if (!user) {
    return NextResponse.json({ success: false, message: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = {
    anfitrionas: searchParams.get('anfitrionas') || undefined,
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    role: searchParams.get('role') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined,
  };

  const { data, total } = await UserRepository.getAll(params);
  return NextResponse.json({ success: true, data, total });
});

export const POST = withAppAuth(
  async (request: Request) => {
    const contentType = request.headers.get('content-type') || '';
    let body: any;
    let fotoFilename = 'default.png';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
      const foto = formData.get('foto');

      if (foto && typeof foto !== 'string' && 'arrayBuffer' in (foto as any)) {
        const file = foto as unknown as File;
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const filename = `user_${Date.now()}.webp`;
          const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');

          if (!existsSync(uploadDir)) {
            await fs.mkdir(uploadDir, { recursive: true });
          }

          try {
            const optimizedBuffer = await sharp(buffer)
              .resize(500, 500, { fit: 'cover', position: 'center' })
              .webp({ quality: 80 })
              .toBuffer();

            await fs.writeFile(path.join(uploadDir, filename), optimizedBuffer);
            fotoFilename = filename;
            logger.info(`[USER API POST] Foto guardada OK: ${filename}`);
          } catch (sharpError) {
            logger.error(`[USER API POST] Error en Sharp, guardando original:`, { error: sharpError });
            const fallbackFilename = `user_${Date.now()}${path.extname(file.name || 'image.png')}`;
            await fs.writeFile(path.join(uploadDir, fallbackFilename), buffer);
            fotoFilename = fallbackFilename;
          }
        }
      } else if (typeof foto === 'string' && foto.startsWith('http')) {
        fotoFilename = foto;
        logger.info(`[USER API POST] Usando URL: ${fotoFilename}`);
      }
    } else {
      body = await request.json();
    }

    logger.info(`[USER API POST] Creando usuario`, { foto: fotoFilename, body: { ...body, password: '***' } });
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
    let fotoFilename: string | null = null;
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      id = formData.get('id') as string;
      body = Object.fromEntries(formData.entries());
      const foto = formData.get('foto');

      if (foto && typeof foto !== 'string' && 'arrayBuffer' in (foto as any)) {
        const file = foto as unknown as File;
        if (file.size > 0) {
          const buffer = Buffer.from(await file.arrayBuffer());
          const filename = `user_${Date.now()}.webp`;
          const uploadDir = path.join(process.cwd(), 'public', 'img', 'users');

          if (!existsSync(uploadDir)) {
            await fs.mkdir(uploadDir, { recursive: true });
          }

          try {
            const optimizedBuffer = await sharp(buffer)
              .resize(500, 500, { fit: 'cover', position: 'center' })
              .webp({ quality: 80 })
              .toBuffer();

            await fs.writeFile(path.join(uploadDir, filename), optimizedBuffer);
            fotoFilename = filename;
            logger.info(`[USER API PUT] Foto guardada OK: ${filename}`);
          } catch (sharpError) {
            logger.error(`[USER API PUT] Error en Sharp, guardando original:`, { error: sharpError });
            const fallbackFilename = `user_${Date.now()}${path.extname(file.name || 'image.png')}`;
            await fs.writeFile(path.join(uploadDir, fallbackFilename), buffer);
            fotoFilename = fallbackFilename;
          }
        }
      } else if (typeof foto === 'string' && foto.startsWith('http')) {
        fotoFilename = foto;
        logger.info(`[USER API PUT] Usando URL: ${fotoFilename}`);
      }
    } else {
      const jsonBody = await request.json();
      id = jsonBody.id;
      body = jsonBody;
    }

    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    logger.info(`[USER API PUT] Actualizando usuario ${id}`, { foto: fotoFilename, body: { ...body, password: '***' } });
    const data = await UserService.updateUser(id, body, fotoFilename);
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
