import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { buildFrame, type SseEventType, type SseSubscriberContext } from './sseEvents';

interface SSEWriter {
  write(chunk: string): void;
  close(): void;
  onClose(callback: () => void): void;
}

/**
 * Reparte los eventos entre los clientes conectados.
 *
 * Cada cliente se registra con su contexto (canal, usuario y rol), y en cada emisión se
 * consulta `lib/api/sseEvents.ts` para saber si ese evento le corresponde y con qué payload.
 * Un cliente nunca ve lo que su contexto no autoriza, aunque el evento se emita globalmente.
 */
class SSEManager {
  private clients: Map<SSEWriter, SseSubscriberContext> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    const globalInstance = global as any;
    if (globalInstance.__sseManager) return globalInstance.__sseManager;
    globalInstance.__sseManager = this;
  }

  public registerClient(writer: SSEWriter, context: SseSubscriberContext) {
    this.clients.set(writer, context);
    this.startHeartbeat();
    this.write(writer, {
      type: 'connected',
      data: {},
      timestamp: getNowInBusinessTimezone()
    });
    writer.onClose(() => this.removeClient(writer));
  }

  public unregisterClient(writer: SSEWriter) {
    this.removeClient(writer);
  }

  /** Cantidad de clientes conectados (útil para diagnóstico y pruebas). */
  public get clientCount(): number {
    return this.clients.size;
  }

  public broadcast(type: SseEventType, data: any = {}) {
    const timestamp = getNowInBusinessTimezone();
    for (const [writer, context] of Array.from(this.clients.entries())) {
      const frame = buildFrame({ type, data, subscriber: context }, timestamp);
      if (!frame) continue;
      this.write(writer, frame);
    }
  }

  private write(writer: SSEWriter, payload: string | Record<string, unknown>) {
    try {
      writer.write(typeof payload === 'string' ? payload : `data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      this.removeClient(writer);
    }
  }

  private removeClient(writer: SSEWriter) {
    this.clients.delete(writer);
    if (this.clients.size === 0 && this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private startHeartbeat() {
    if (this.heartbeatInterval) return;
    this.heartbeatInterval = setInterval(() => {
      if (this.clients.size === 0) {
        clearInterval(this.heartbeatInterval!);
        this.heartbeatInterval = null;
        return;
      }
      const frame = `data: ${JSON.stringify({
        type: 'ping',
        data: {},
        timestamp: getNowInBusinessTimezone()
      })}\n\n`;
      for (const writer of Array.from(this.clients.keys())) {
        this.write(writer, frame);
      }
    }, 30000);
  }
}

export const sseManager = new SSEManager();

/**
 * Emite un evento al catálogo. La audiencia se resuelve por evento en `sseEvents.ts`.
 */
export const sendNotificationToAll = (type: SseEventType, data: any = {}) =>
  sseManager.broadcast(type, data);
