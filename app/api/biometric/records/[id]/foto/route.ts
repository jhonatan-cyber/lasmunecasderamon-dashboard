import { withRoute } from '@/lib/api/withRoute';
import { obtenerBytesDeFoto } from '@/modules/asistencia';

/**
 * Foto de la verificación que originó una asistencia: el JPEG que el lector
 * capturó en la puerta (`/SnapShotFilePath/...`), bajado y guardado por
 * `recordPhotos`. Sirve las miniaturas del panel de Configuraciones →
 * Asistencia y el detalle de asistencias.
 *
 * Caché privada larga: el contenido de un record nunca cambia.
 */
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  { auth: true, access: 'authenticated' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const bytes = await obtenerBytesDeFoto(id);
    if (!bytes) {
      return Response.json(
        { success: false, message: 'Sin foto para este registro.' },
        { status: 404 }
      );
    }
    return new Response(bytes, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.byteLength),
        'Cache-Control': 'private, max-age=604800'
      }
    });
  }
);
