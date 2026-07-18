import logger from '@/lib/utils/logger';

interface ConnectionState {
  eventSource: EventSource | null;
  refCount: number;
  listeners: Set<(payload: any) => void>;
  reconnectTimeout: ReturnType<typeof setTimeout> | null;
  isConnected: boolean;
}

class SSEManager {
  private connections = new Map<string, ConnectionState>();

  /**
   * Subscribe a listener to a specific SSE URL.
   * Creates the connection lazily when the first subscriber appears,
   * and closes it when the last subscriber unsubscribes.
   * Returns an unsubscribe function.
   */
  subscribe(url: string, listener: (payload: any) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    let conn = this.connections.get(url);
    if (!conn) {
      conn = {
        eventSource: null,
        refCount: 0,
        listeners: new Set(),
        reconnectTimeout: null,
        isConnected: false
      };
      this.connections.set(url, conn);
    }

    conn.refCount++;
    conn.listeners.add(listener);

    if (!conn.eventSource) {
      this.connect(url);
    }

    return () => {
      this.unsubscribe(url, listener);
    };
  }

  /**
   * Force reconnect for a specific URL.
   */
  reconnect(url: string) {
    if (typeof window === 'undefined') return;
    const conn = this.connections.get(url);
    if (conn) {
      this.connect(url);
    }
  }

  /**
   * Get connection state for a URL.
   */
  getConnectionState(url: string): { isConnected: boolean; refCount: number; hasListeners: boolean } {
    const conn = this.connections.get(url);
    return {
      isConnected: conn?.isConnected ?? false,
      refCount: conn?.refCount ?? 0,
      hasListeners: conn ? conn.listeners.size > 0 : false
    };
  }

  private unsubscribe(url: string, listener: (payload: any) => void) {
    const conn = this.connections.get(url);
    if (!conn) return;

    conn.listeners.delete(listener);
    conn.refCount--;

    if (conn.refCount <= 0) {
      this.cleanupConnection(url);
      this.connections.delete(url);
    }
  }

  private connect(url: string) {
    const conn = this.connections.get(url);
    if (!conn || typeof window === 'undefined') return;

    this.cleanupConnection(url);

    logger.info(`[SSEManager] Conectando a ${url}...`);
    const es = new EventSource(url);

    es.onopen = () => {
      logger.info(`[SSEManager] Conectado a ${url}`);
      conn.isConnected = true;
    };

    es.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);

        // Notify all listeners for this URL, protecting each from errors
        for (const cb of Array.from(conn.listeners)) {
          try {
            cb(payload);
          } catch (err) {
            logger.captureException(err, { context: `SSEManager:listener:${url}` });
          }
        }
      } catch (err) {
        logger.captureException(err, { context: `SSEManager:parseMessage:${url}` });
      }
    };

    es.onerror = () => {
      logger.warn(`[SSEManager] Error en ${url}, reintentando en 5s...`);
      conn.isConnected = false;
      this.cleanupConnection(url);
      conn.reconnectTimeout = setTimeout(() => {
        this.connect(url);
      }, 5000);
    };

    conn.eventSource = es;
  }

  private cleanupConnection(url: string) {
    const conn = this.connections.get(url);
    if (!conn) return;

    if (conn.reconnectTimeout) {
      clearTimeout(conn.reconnectTimeout);
      conn.reconnectTimeout = null;
    }
    if (conn.eventSource) {
      conn.eventSource.close();
      conn.eventSource = null;
    }
    conn.isConnected = false;
  }
}

export const sseManager = new SSEManager();
