import { afterEach, describe, expect, it, vi } from 'vitest';
import { sendNotificationToAll, sseManager } from '@/lib/api/sseService';
import type { SseSubscriberContext } from '@/lib/api/sseEvents';

interface FakeClient {
  context: SseSubscriberContext;
  frames: any[];
  raw: string[];
  write: (chunk: string) => void;
  close: () => void;
  onClose: (callback: () => void) => void;
}

/** Clientes registrados en el test actual, para darlos de baja siempre al terminar. */
let registrados: FakeClient[] = [];

function makeClient(context: SseSubscriberContext): FakeClient {
  const raw: string[] = [];
  const frames: any[] = [];
  return {
    context,
    raw,
    frames,
    write(chunk: string) {
      raw.push(chunk);
      frames.push(JSON.parse(chunk.replace(/^data: /, '')));
    },
    close() {},
    onClose() {}
  };
}

function withClients(contexts: SseSubscriberContext[]): FakeClient[] {
  const clients = contexts.map(makeClient);
  for (const client of clients) {
    sseManager.registerClient(client, client.context);
    registrados.push(client);
  }
  return clients;
}

const cajero: SseSubscriberContext = { channel: 'staff', userId: 'u-pepe', role: 'Cajero' };
const anfitriona: SseSubscriberContext = { channel: 'staff', userId: 'u-ana', role: 'Anfitriona' };
const admin: SseSubscriberContext = { channel: 'staff', userId: 'u-admin', role: 'Administrador' };
const kiosk: SseSubscriberContext = { channel: 'kiosk' };

const tipos = (client: FakeClient) => client.frames.map(frame => frame.type);

afterEach(() => {
  for (const client of registrados) sseManager.unregisterClient(client);
  registrados = [];
  expect(sseManager.clientCount).toBe(0);
});

describe('sseManager', () => {
  describe('registro', () => {
    it('saluda al cliente al conectarse con un frame `connected`', () => {
      const [cliente] = withClients([cajero]);
      expect(cliente.frames[0]).toMatchObject({ type: 'connected' });
      expect(cliente.raw[0]).toMatch(/^data: \{.*\}\n\n$/);
    });

    it('cuenta los clientes conectados y los libera al darse de baja', () => {
      const clientes = withClients([cajero, anfitriona, kiosk]);
      expect(sseManager.clientCount).toBe(3);
      for (const cliente of clientes) sseManager.unregisterClient(cliente);
      expect(sseManager.clientCount).toBe(0);
    });
  });

  describe('reparto por audiencia', () => {
    it('el evento operativo llega a todo el personal y no al kiosko', () => {
      const [c1, c2, c3, c4] = withClients([cajero, anfitriona, admin, kiosk]);

      sendNotificationToAll('new_order', { id: 'p-1', total: 32000 });

      expect(tipos(c1)).toContain('new_order');
      expect(tipos(c2)).toContain('new_order');
      expect(tipos(c3)).toContain('new_order');
      expect(tipos(c4)).toEqual(['connected']);
    });

    it('el evento financiero llega solo al administrador', () => {
      const [c1, c2, c3, c4] = withClients([cajero, anfitriona, admin, kiosk]);

      sendNotificationToAll('ANTICIPO_PROCESSED', { monto: 80000, empleado: 'Lizi' });

      expect(tipos(c3)).toContain('ANTICIPO_PROCESSED');
      expect(tipos(c1)).not.toContain('ANTICIPO_PROCESSED');
      expect(tipos(c2)).not.toContain('ANTICIPO_PROCESSED');
      expect(tipos(c4)).not.toContain('ANTICIPO_PROCESSED');
    });

    it('el evento dirigido llega al usuario afectado y a la pantalla pública, y a nadie más', () => {
      const [c1, c2, c3, c4] = withClients([cajero, anfitriona, admin, kiosk]);

      sendNotificationToAll('profile_updated', { userId: 'u-ana' });

      expect(tipos(c2)).toContain('profile_updated');
      expect(tipos(c4)).toContain('profile_updated');
      expect(tipos(c1)).not.toContain('profile_updated');
      expect(tipos(c3)).not.toContain('profile_updated');
    });

    it('un rol no reconocido no recibe lo que es solo para administración', () => {
      const [raro] = withClients([{ channel: 'staff', userId: 'u-1', role: 'supervisor' }]);

      sendNotificationToAll('security_alert', { message: 'intento de acceso' });

      expect(tipos(raro)).toEqual(['connected']);
    });
  });

  describe('proyección del canal público', () => {
    it('la asistencia registrada llega al kiosko sin la credencial del QR', () => {
      const [cajeroClient, kioskClient] = withClients([cajero, kiosk]);

      sendNotificationToAll('attendance_registered', {
        user: { id: 'u-2', nombre: 'Ana', apellido: 'Perez' },
        qrToken: 'credencial-que-no-debe-salir'
      });

      expect(tipos(kioskClient)).toContain('attendance_registered');
      expect(kioskClient.raw.join('')).not.toContain('credencial-que-no-debe-salir');
      expect(kioskClient.frames[1].data).toEqual({
        user: { id: 'u-2', nombre: 'Ana', apellido: 'Perez' }
      });
      // El personal ya no recibe este evento: su único consumidor es la pantalla.
      expect(tipos(cajeroClient)).toEqual(['connected']);
    });

    it('el cambio de código va al kiosko y al personal con el mismo payload', () => {
      const [cajeroClient, kioskClient] = withClients([cajero, kiosk]);

      sendNotificationToAll('code_changed', { codigo: '7391' });

      expect(kioskClient.frames[1].data).toEqual({ codigo: '7391' });
      expect(cajeroClient.frames[1].data).toEqual({ codigo: '7391' });
    });
  });

  describe('clientes caídos', () => {
    it('si un cliente falla al escribir se da de baja sin afectar a los demás', () => {
      const roto: FakeClient = {
        context: cajero,
        frames: [],
        raw: [],
        write() {
          throw new Error('socket cerrado');
        },
        close() {},
        onClose() {}
      };
      sseManager.registerClient(roto, roto.context);
      const [sano] = withClients([anfitriona]);

      expect(() => sendNotificationToAll('timers_updated', {})).not.toThrow();

      expect(sseManager.clientCount).toBe(1);
      expect(tipos(sano)).toContain('timers_updated');
    });
  });

  describe('latido', () => {
    it('envía un ping periódico a todos los clientes', () => {
      vi.useFakeTimers();
      try {
        const [c1, c2] = withClients([cajero, kiosk]);
        vi.advanceTimersByTime(30000);
        expect(tipos(c1)).toContain('ping');
        expect(tipos(c2)).toContain('ping');
        sseManager.unregisterClient(c1);
        sseManager.unregisterClient(c2);
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
