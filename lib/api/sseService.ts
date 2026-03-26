
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';

interface SSEWriter {
  write(chunk: string): void;
  close(): void;
  onClose(callback: () => void): void;
}

class SSEManager {
  private clients: Set<SSEWriter> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor() {
    const globalInstance = global as any;
    if (globalInstance.__sseManager) return globalInstance.__sseManager;
    globalInstance.__sseManager = this;
  }

  public registerClient(writer: SSEWriter) {
    this.clients.add(writer);
    this.startHeartbeat();
    writer.write(`data: ${JSON.stringify({ type: 'connected', timestamp: getNowInBusinessTimezone() })}\n\n`);
    writer.onClose(() => this.removeClient(writer));
  }

  public broadcast(type: string, data: any = {}) {
    const message = { type, data, timestamp: getNowInBusinessTimezone() };
    const payload = `data: ${JSON.stringify(message)}\n\n`;
    this.clients.forEach(client => {
      try { client.write(payload); }
      catch (err) { this.removeClient(client); }
    });
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
      this.broadcast('ping');
    }, 30000);
  }
}

export const sseManager = new SSEManager();
export const sendNotificationToAll = (type: string, data: any) => sseManager.broadcast(type, data);
