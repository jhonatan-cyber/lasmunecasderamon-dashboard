import { withRoute } from '@/lib/api/withRoute';
import { obtenerBytesDeFoto } from '@/modules/asistencia';
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
