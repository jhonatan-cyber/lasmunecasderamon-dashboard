import { sseManager } from '@/lib/api/sseService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const writer = {
        write(chunk: string) {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {}
        },
        close() {
          try {
            controller.close();
          } catch {}
        },
        onClose(_callback: () => void) {}
      };

      sseManager.registerClient(writer);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    }
  });
}
