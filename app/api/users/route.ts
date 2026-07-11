import { NextResponse } from 'next/server';
import { withAppAuth } from '@/lib/api/app-api-wrapper';
import { UserService } from '@/lib/services/UserService';
import { AuditService } from '@/lib/services/AuditService';
import { processAndSaveImage } from '@/lib/utils/image-utils';
import logger from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export const GET = withAppAuth(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const params = {
    anfitrionas: searchParams.get('anfitrionas') || undefined,
    search: searchParams.get('search') || undefined,
    status: searchParams.get('status') || undefined,
    role: searchParams.get('role') || undefined,
    loggedIn: searchParams.get('loggedIn') === '1' || searchParams.get('loggedIn') === 'true',
    enLocal: searchParams.get('enLocal') === '1' || searchParams.get('enLocal') === 'true',
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
  };

  const { data, total } = await UserService.getAll(params);
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
          try {
            fotoFilename = await processAndSaveImage(buffer, 'user', {
              width: 500,
              height: 500,
              fit: 'cover',
              position: 'center',
              quality: 80
            });
            logger.info(`[USER API POST] Foto guardada OK: ${fotoFilename}`);
          } catch (sharpError) {
            // ponytail: processAndSaveImage failed; save raw as fallback
            logger.error(`[USER API POST] Error en Sharp, guardando original:`, {
              error: sharpError
            });
            const { writeFile, mkdir } = await import('fs/promises');
            const { join, extname } = await import('path');
            const fallbackDir = join(process.cwd(), 'public', 'img', 'users');
            await mkdir(fallbackDir, { recursive: true });
            const fallbackFilename = `user_fallback_${Date.now()}${extname(file.name || 'image.png')}`;
            await writeFile(join(fallbackDir, fallbackFilename), buffer);
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

    logger.info(`[USER API POST] Creando usuario`, {
      foto: fotoFilename,
      body: { ...body, password: '***' }
    });
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

export const PUT = withAppAuth(async (request: Request, { user }: { user: any }) => {
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
        try {
          fotoFilename = await processAndSaveImage(buffer, 'user', {
            width: 500,
            height: 500,
            fit: 'cover',
            position: 'center',
            quality: 80
          });
          logger.info(`[USER API PUT] Foto guardada OK: ${fotoFilename}`);
        } catch (sharpError) {
          // ponytail: processAndSaveImage failed; save raw as fallback
          logger.error(`[USER API PUT] Error en Sharp, guardando original:`, { error: sharpError });
          const { writeFile, mkdir } = await import('fs/promises');
          const { join, extname } = await import('path');
          const fallbackDir = join(process.cwd(), 'public', 'img', 'users');
          await mkdir(fallbackDir, { recursive: true });
          const fallbackFilename = `user_fallback_${Date.now()}${extname(file.name || 'image.png')}`;
          await writeFile(join(fallbackDir, fallbackFilename), buffer);
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

  const isAdministrator = user.role?.toLowerCase() === 'administrador';
  const isSelfUpdate = user.id?.toString() === id.toString();
  const userPermissions = (user.permissions as any)?.users;
  const hasWritePermission = isAdministrator || (userPermissions && userPermissions.write === true);

  if (!isSelfUpdate && !hasWritePermission) {
    try {
      await AuditService.log({
        user_id: user.id,
        action: `PUT /api/users FORBIDDEN`,
        resource_type: 'users',
        details: { userId: user.id, requestId: id, isSelfUpdate, userRole: user.role }
      });
    } catch (e) {}

    return NextResponse.json(
      { success: false, message: 'Permisos insuficientes' },
      { status: 403 }
    );
  }

  logger.info(`[USER API PUT] Actualizando usuario ${id}`, {
    foto: fotoFilename,
    body: { ...body, password: '***' }
  });
  const data = await UserService.updateUser(id, body, fotoFilename);
  return NextResponse.json({ success: true, message: 'Usuario actualizado', data });
});

export const DELETE = withAppAuth(
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    await UserService.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  },
  { module: 'users', action: 'delete' }
);
