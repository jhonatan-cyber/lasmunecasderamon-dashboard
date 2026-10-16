import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import {
  listarPersonalConPresencia,
  fijarPresenciaLocal,
  fijarPresenciaDeTodoElPersonal
} from '@/modules/identidad';
import { sendNotificationToAll } from '@/lib/api/sseService';

export const dynamic = 'force-dynamic';

/**
 * Herramienta de pruebas del tab Configuración → Pruebas: lista al personal
 * activo con su presencia en el local y permite forzarla (individual o masiva).
 * Es el mismo flag `logins.en_local` que habilita ventas/servicios/pedidos.
 */
export const GET = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'read' },
  async () => {
    return NextResponse.json({ success: true, data: await listarPersonalConPresencia() });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'settings', action: 'write' },
  async (request: Request) => {
    const body = await request.json().catch(() => ({}));
    const presente = body?.presente === true;

    if (body?.todos === true) {
      const total = await fijarPresenciaDeTodoElPersonal(presente);
      sendNotificationToAll('presence_updated', { en_local: presente, todos: true });
      return NextResponse.json({
        success: true,
        total,
        message: presente
          ? `Se marcó como presente a ${total} persona(s).`
          : `Se sacó del local a ${total} persona(s).`
      });
    }

    const usuarioId = String(body?.usuario_id ?? '').trim();
    if (!usuarioId) {
      return NextResponse.json(
        { success: false, message: 'Falta el usuario a actualizar' },
        { status: 400 }
      );
    }

    await fijarPresenciaLocal(usuarioId, presente);
    sendNotificationToAll('presence_updated', { userId: usuarioId, en_local: presente });
    return NextResponse.json({ success: true });
  }
);
