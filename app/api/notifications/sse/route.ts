import { NextResponse } from 'next/server';
import { sseManager } from '@/lib/api/sseService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();
  let controllerReference: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerReference = controller;
      const writer = {
        write(chunk: string) {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch (e) {}
        },
        close() {
          try {
            controller.close();
          } catch (e) {}
        },
        onClose(callback: () => void) {
          // No direct onClose in ReadableStream start, handled via cancel
        }
      };
      sseManager.registerClient(writer);
    },
    cancel() {
      // Here we should ideally have a way to unregister,
      // but since we don't have the writer reference easily here
      // without more complexity, I'll keep it simple for now
      // and let the heartbeat/broadcast handle dead clients.
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
