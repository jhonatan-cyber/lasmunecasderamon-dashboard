import { withRoute } from '@/lib/api/withRoute';
import { openVideoStream } from '@/lib/biometric/videoStream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withRoute(
  { auth: true, access: 'administrator' },
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    return openVideoStream(id, request.signal);
  }
);
