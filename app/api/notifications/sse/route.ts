import { sseManager } from '@/lib/api/sseService';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  let writerClosed = false;
  let writer: {
    write(chunk: string): void;
    close(): void;
    onClose(callback: () => void): void;
  } | null = null;
  let handleClose: (() => void) | null = null;

  const cleanup = () => {
    if (writerClosed) return;
    writerClosed = true;
    if (writer) {
      sseManager.unregisterClient(writer);
    }
    if (handleClose) {
      handleClose();
      handleClose = null;
    }
    writer = null;
  };

  const stream = new ReadableStream({
    start(controller) {
      writer = {
        write(chunk: string) {
          try {
            controller.enqueue(encoder.encode(chunk));
          } catch {
            cleanup();
          }
        },
        close() {
          try {
            controller.close();
          } catch {
            // Ignore close-after-close errors during cleanup.
          } finally {
            cleanup();
          }
        },
        onClose(callback: () => void) {
          handleClose = callback;
        }
      };
      sseManager.registerClient(writer);
      request.signal.addEventListener('abort', cleanup, { once: true });
    },
    cancel() {
      cleanup();
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
