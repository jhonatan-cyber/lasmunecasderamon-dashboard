/**
 * Event Bus Tipado para comunicación entre componentes y comunicación global.
 * Reemplaza el uso de `window.dispatchEvent` con payloads "any".
 */

export interface AppEvents {
  'ventaRegistrada': { ventaId?: string; codigo?: string };
  'openOrderModal': { orderId: number; codigo?: string };
  'updatePendingOrders': { type?: 'order-processed' | 'order-deleted' | 'order-created'; orderId?: number };
  'closeOrderModal': { orderId: number };
  'openServiceRequestModal': { solicitud: any };
  'updateServiceRequests': void;
  'test-notification': { type: string; data: any };
  'sse-reconnect': void;
  'sse-message': any;
}

type EventCallback<T extends keyof AppEvents> = (payload: AppEvents[T]) => void;

class EventBus {
  private listeners: Map<keyof AppEvents, Set<Function>> = new Map();

  on<T extends keyof AppEvents>(event: T, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Retorna función para desuscribir
    return () => this.off(event, callback);
  }

  off<T extends keyof AppEvents>(event: T, callback: EventCallback<T>) {
    if (this.listeners.has(event)) {
      this.listeners.get(event)!.delete(callback);
    }
  }

  emit<T extends keyof AppEvents>(event: T, payload?: AppEvents[T]) {
    if (this.listeners.has(event)) {
      for (const callback of Array.from(this.listeners.get(event)!)) {
        try {
          callback(payload as AppEvents[T]);
        } catch (error) {
          console.error(`[EventBus] Error executing callback for event ${event}:`, error);
        }
      }
    }
  }
}

export const appEventBus = new EventBus();
