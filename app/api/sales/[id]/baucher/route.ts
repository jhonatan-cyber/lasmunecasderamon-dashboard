import path from 'node:path';
import fs from 'fs/promises';
import { withRoute } from '@/lib/api/withRoute';
import { SaleService } from '@/workflows/ventas';
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
 * Foto del baucher de una venta pagada con transferencia, guardada por
 * `SaleService.createSale` en `public/img/sales`.
 *
 * Es la constancia de un pago, así que no vive bajo `/api/images` (que el
 * middleware deja público para las fotos de perfil y el catálogo): la ruta exige
 * sesión y el permiso de lectura de ventas, y el nombre del archivo sale de la
 * fila de la venta, nunca del cliente.
 */
export const GET = withRoute(
  { auth: true, module: 'sales', action: 'read' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const id = (await params).id;
    const filename = await SaleService.getBaucherFoto(id);
    if (!filename || filename !== path.basename(filename)) {
      return Response.json(
        { success: false, message: 'La venta no tiene foto de baucher' },
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
      const image = await fs.readFile(path.join(process.cwd(), 'public', 'img', 'sales', filename));
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
          { success: false, message: 'La venta no tiene foto de baucher' },
          { status: 404 }
        );
      }
      logger.error('[Sales API GET baucher] No se pudo leer la foto:', { id, error });
      return Response.json({ success: false, message: 'No se pudo leer la foto' }, { status: 500 });
    }
  }
);
