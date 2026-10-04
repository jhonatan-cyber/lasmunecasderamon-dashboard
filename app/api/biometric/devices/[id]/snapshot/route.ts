import { withRoute } from '@/lib/api/withRoute';
import { fotoEnVivoDelEquipo } from '@/modules/asistencia';

/**
 * Foto en vivo de la cámara del lector, para mostrarla en el diálogo de
 * enrolamiento (lo que la puerta está viendo ahora mismo).
 *
 * Es un proxy: el navegador no puede autenticarse contra el equipo (Digest con
 * las credenciales cifradas), así que el servidor consulta `snapshot.cgi` y
 * devuelve el JPEG. Sin caché: es una cámara.
 */
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  { auth: true, access: 'administrator' },
  async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const foto = await fotoEnVivoDelEquipo(id);
    const bytes = Buffer.from(foto.base64, 'base64');
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': foto.contentType,
        'Content-Length': String(bytes.length),
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  }
);
