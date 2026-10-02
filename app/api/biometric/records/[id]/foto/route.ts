import { withRoute } from '@/lib/api/withRoute';
import { query } from '@/lib/database/db';

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
    const filas = await query<{ foto: Buffer | null }[]>(
      'SELECT foto FROM biometric_device_records WHERE id = ?',
      [id]
    );
    const foto = filas[0]?.foto;
    if (!foto || foto.length === 0) {
      return Response.json(
        { success: false, message: 'Sin foto para este registro.' },
        { status: 404 }
      );
    }
    const bytes = Buffer.from(foto);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, max-age=604800'
      }
    });
  }
);
