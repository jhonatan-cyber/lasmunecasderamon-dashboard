import { sseManager } from './sseService';
import type { SseSubscriberContext } from './sseEvents';

/**
 * Abre un stream SSE y registra al cliente con su contexto.
 *
 * El mismo `sseManager` sirve a los dos canales; lo que cambia entre ellos es el contexto
 * con el que se registran y, por lo tanto, qué eventos les llegan:
 *
 *  - `/api/notifications/sse`  → `{ channel: 'staff' }`, detrás de una sesión válida.
 *  - `/api/notifications/kiosk` → `{ channel: 'kiosk' }`, proyección pública reducida.
 */
export function createSseStream(
  request: Request,
  context: SseSubscriberContext,
  onDisconnect?: () => void
): Response {
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
    onDisconnect?.();
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
            // el stream ya estaba cerrado
          } finally {
            cleanup();
          }
        },
        onClose(callback: () => void) {
          handleClose = callback;
        }
      };
      sseManager.registerClient(writer, context);
      request.signal.addEventListener('abort', () => writer?.close(), { once: true });
      if (request.signal.aborted) writer.close();
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
