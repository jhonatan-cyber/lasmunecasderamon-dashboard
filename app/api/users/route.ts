import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { UserService } from '@/lib/services/UserService';
import { processAndSaveImage } from '@/lib/utils/image-utils';
import logger from '@/lib/utils/logger';

export const dynamic = 'force-dynamic';

export const GET = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request) => {
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
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
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
    const result = await UserService.createUser(body, fotoFilename);

    // La contraseña temporal se devuelve en los encabezados para evitar
    // que quede expuesta en logs/respuestas JSON del frontend.
    // El usuario debe cambiar la contraseña en el primer inicio de sesión.
    const responseBody: Record<string, unknown> = {
      success: true,
      message: 'Usuario creado. Comparte la contraseña temporal de forma segura con el usuario.',
      data: result.user
    };

    const response = NextResponse.json(responseBody, { status: 201 });
    response.headers.set('X-Temp-Password', result.tempPassword);
    return response;
  }
);

export const PATCH = withRoute(
  { auth: true, audit: true, module: 'users', action: 'write' },
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

    // La UI muestra qué pasó con el lector de la puerta: al desactivar se quitó
    // a la persona (para que la puerta deje de reconocerla) y al activar se la
    // restauró desde sus plantillas. `lector.intentado` es false cuando la
    // persona no tenía código ni plantillas: ahí no hubo nada que sincronizar.
    const lector = (
      data as { lector?: { intentado: boolean; equiposOk: string[]; equiposFallo: string[] } }
    ).lector;
    const esDesactivar = action === 'deactivate';
    const partes: string[] = [];
    if (lector?.intentado) {
      const verbo = esDesactivar ? 'quitada del lector' : 'restaurada en el lector';
      if (lector.equiposOk.length > 0) partes.push(`${verbo} en ${lector.equiposOk.join(', ')}`);
      if (lector.equiposFallo.length > 0)
        partes.push(
          `sin poder ${esDesactivar ? 'quitarla' : 'restaurarla'} en ${lector.equiposFallo.join(', ')}`
        );
    }

    return NextResponse.json({
      success: true,
      message:
        partes.length > 0
          ? `Usuario ${esDesactivar ? 'desactivado' : 'activado'}: ${partes.join('; ')}.`
          : 'Estado del usuario actualizado correctamente',
      lector: lector ?? { intentado: false, equiposOk: [], equiposFallo: [] },
      data
    });
  }
);

export const PUT = withRoute(
  { auth: true, access: 'authenticated', audit: true },
  async (request: Request, { user }: { params: any; user: any }) => {
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
            logger.error(`[USER API PUT] Error en Sharp, guardando original:`, {
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
        logger.info(`[USER API PUT] Usando URL: ${fotoFilename}`);
      }
    } else {
      const jsonBody = await request.json();
      id = jsonBody.id;
      body = jsonBody;
    }

    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    if (user.id?.toString() !== id.toString() && !(user.permissions as any)?.users?.write) {
      return NextResponse.json(
        { success: false, message: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    logger.info(`[USER API PUT] Actualizando usuario ${id}`, {
      foto: fotoFilename,
      body: { ...body, password: '***' }
    });
    const { user: userData, newTempPassword } = await UserService.updateUser(
      id,
      body,
      fotoFilename
    );

    const response = NextResponse.json({
      success: true,
      message: newTempPassword
        ? 'Usuario actualizado. La contraseña temporal se ha enviado en los encabezados de la respuesta. Compártela de forma segura con el usuario.'
        : 'Usuario actualizado correctamente.',
      data: userData
    });

    if (newTempPassword) {
      response.headers.set('X-Temp-Password', newTempPassword);
    }

    return response;
  }
);

export const DELETE = withRoute(
  { auth: true, audit: true, module: 'users', action: 'delete' },
  async (request: Request) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json({ success: false, message: 'El ID es requerido' }, { status: 400 });

    await UserService.delete(id);
    return NextResponse.json({ success: true, message: 'Usuario eliminado' });
  }
);
