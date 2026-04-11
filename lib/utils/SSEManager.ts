import { appEventBus, AppEvents } from '@/lib/utils/eventBus';

class SSEManager {
  private eventSource: EventSource | null = null;
  private url: string | null = null;
  private isConnected: boolean = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(url: string) {
    if (typeof window === 'undefined') return;

    if (this.url === url && this.isConnected && this.eventSource) {
      return; // Ya estÃ¡ conectado al mismo endpoint
    }

    this.url = url;
    this.cleanup();

    // eslint-disable-next-line no-console
    console.info(`[SSEManager] Conectando a ${url}...`);
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      // eslint-disable-next-line no-console
      console.info(`[SSEManager] Conectado exitosamente.`);
      this.isConnected = true;
      appEventBus.emit('sse-reconnect');
    };

    this.eventSource.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);

        // Emite un evento genÃ©rico sse-message para todos los payloads
        appEventBus.emit('sse-message', payload);
      } catch (err) {
        console.error('[SSEManager] Error parseando mensaje SSE:', err);
      }
    };

    this.eventSource.onerror = () => {
      console.warn('[SSEManager] Error de conexiÃ³n, reintentando en 5s...');
      this.isConnected = false;
      this.cleanup(false);
      this.reconnectTimeout = setTimeout(() => {
        if (this.url) this.connect(this.url);
      }, 5000);
    };
  }

  disconnect() {
    this.url = null;
    this.cleanup(true);
  }

  private cleanup(resetUrl = false) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
    if (resetUrl) this.url = null;
  }
}

export const sseManager = new SSEManager();
