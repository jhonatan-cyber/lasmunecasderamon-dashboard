import { appEventBus, AppEvents } from '@/lib/utils/eventBus';
import logger from '@/lib/utils/logger';

class SSEManager {
  private eventSource: EventSource | null = null;
  private url: string | null = null;
  private isConnected: boolean = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  connect(url: string) {
    if (typeof window === 'undefined') return;

    if (this.url === url && this.isConnected && this.eventSource) {
      return; // Ya está conectado al mismo endpoint
    }

    this.url = url;
    this.cleanup();

    logger.info(`[SSEManager] Conectando a ${url}...`);
    this.eventSource = new EventSource(url);

    this.eventSource.onopen = () => {
      logger.info(`[SSEManager] Conectado exitosamente.`);
      this.isConnected = true;
      appEventBus.emit('sse-reconnect');
    };

    this.eventSource.onmessage = event => {
      try {
        const payload = JSON.parse(event.data);

        // Emite un evento genérico sse-message para todos los payloads
        appEventBus.emit('sse-message', payload);
      } catch (err) {
        logger.captureException(err, { context: 'SSEManager:parseMessage' });
      }
    };

    this.eventSource.onerror = () => {
      logger.warn('[SSEManager] Error de conexión, reintentando en 5s...');
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
