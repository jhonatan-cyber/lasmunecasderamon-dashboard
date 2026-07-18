import logger from '@/lib/utils/logger';

export interface AppEvents {
  ventaRegistrada: { ventaId?: string; codigo?: string };
  openOrderModal: { orderId: number | string; codigo?: string };
  updatePendingOrders: {
    type?: 'order-processed' | 'order-deleted' | 'order-created';
    orderId?: number | string | null;
  };
  closeOrderModal: { orderId: number | string };
  openServiceRequestModal: { solicitud: any };
  updateServiceRequests: void;
  'test-notification': { type: string; data: any };
  cajaClosed: void;
  cajaOpened: void;
  updateSales: void;
  timer_ended_event: any;
  refreshNotifications: void;
  refreshRooms: { roomId?: any } | void;
}

type EventCallback<T extends keyof AppEvents> = (payload: AppEvents[T]) => void;
type ListenerMap = { [K in keyof AppEvents]?: Set<EventCallback<K>> };

class EventBus {
  private listeners: ListenerMap = {};

  on<T extends keyof AppEvents>(event: T, callback: EventCallback<T>): () => void {
    const callbacks = this.listeners[event] as Set<EventCallback<T>> | undefined;

    if (callbacks) {
      callbacks.add(callback);
    } else {
      this.listeners[event] = new Set<EventCallback<T>>([callback]) as ListenerMap[T];
    }

    return () => this.off(event, callback);
  }

  off<T extends keyof AppEvents>(event: T, callback: EventCallback<T>) {
    const callbacks = this.listeners[event] as Set<EventCallback<T>> | undefined;
    callbacks?.delete(callback);
  }

  emit<T extends keyof AppEvents>(event: T, payload?: AppEvents[T]) {
    const callbacks = this.listeners[event] as Set<EventCallback<T>> | undefined;
    if (!callbacks) return;

    for (const callback of Array.from(callbacks)) {
      try {
        callback(payload as AppEvents[T]);
      } catch (error) {
        logger.captureException(error, { context: `eventBus:${event}` });
      }
    }
  }
}

export const appEventBus = new EventBus();
