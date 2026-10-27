import path from 'node:path';
import fs from 'fs/promises';
import { withRoute } from '@/lib/api/withRoute';
import { obtenerBaucherEntrada } from '@/modules/entradas';
import { logger } from '@/lib/utils/logger';

export const runtime = 'nodejs';

const MIME_TYPES: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif'
};

/**
 * Foto del baucher de una entrada cobrada con transferencia, guardada por
 * `registrarEntrada` en `public/img/tickets`.
 *
 * Es la constancia de un pago, así que la ruta exige sesión y el permiso de
 * lectura de entradas, y el nombre del archivo sale de la fila, nunca del
 * cliente.
 */
export const GET = withRoute(
  { auth: true, module: 'entradas', action: 'view' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const filename = await obtenerBaucherEntrada(id);
    if (!filename || filename !== path.basename(filename)) {
      return Response.json(
        { success: false, message: 'La entrada no tiene foto de baucher' },
        { status: 404 }
      );
    }
    const contentType = MIME_TYPES[path.extname(filename).toLowerCase()];
    if (!contentType) {
      return Response.json(
        { success: false, message: 'Formato de imagen no soportado' },
        { status: 404 }
      );
    }
    try {
      const image = await fs.readFile(
        path.join(process.cwd(), 'public', 'img', 'tickets', filename)
      );
      return new Response(new Uint8Array(image), {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=3600',
          'X-Content-Type-Options': 'nosniff'
        }
      });
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        return Response.json(
          { success: false, message: 'La entrada no tiene foto de baucher' },
          { status: 404 }
        );
      }
      logger.error('[Tickets API GET baucher] No se pudo leer la foto:', { id, error });
      return Response.json({ success: false, message: 'No se pudo leer la foto' }, { status: 500 });
    }
  }
);
