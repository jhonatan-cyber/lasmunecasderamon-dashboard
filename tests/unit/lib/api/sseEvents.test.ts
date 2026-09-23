import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  canReceive,
  isSseEventType,
  normalizeRole,
  resolvePayload,
  SSE_EVENTS,
  SSE_EVENT_TYPES,
  type SseSubscriberContext
} from '@/lib/api/sseEvents';

const cajero: SseSubscriberContext = { channel: 'staff', userId: 'u-cajero', role: 'Cajero' };
const anfitriona: SseSubscriberContext = { channel: 'staff', userId: 'u-ana', role: 'anfitriona' };
const admin: SseSubscriberContext = { channel: 'staff', userId: 'u-admin', role: 'administrador' };
const sinRol: SseSubscriberContext = { channel: 'staff', userId: 'u-x', role: null };
const kiosk: SseSubscriberContext = { channel: 'kiosk' };

describe('catálogo de eventos SSE', () => {
  describe('eventos operativos', () => {
    it('los recibe cualquier sesión válida, con su payload completo', () => {
      const data = { id: 'pedido-1', cliente: 'Ana', total: 25000 };
      for (const subscriber of [cajero, anfitriona, admin, sinRol]) {
        expect(resolvePayload({ type: 'new_order', data, subscriber })).toEqual(data);
      }
    });

    it('no los recibe la pantalla pública', () => {
      expect(canReceive({ type: 'new_order', subscriber: kiosk })).toBe(false);
      expect(canReceive({ type: 'timers_updated', subscriber: kiosk })).toBe(false);
      expect(canReceive({ type: 'updateSales', subscriber: kiosk })).toBe(false);
    });
  });

  describe('eventos personales o financieros', () => {
    const sensibles = [
      'ANTICIPO_PROCESSED',
      'anticipo_processed',
      'anticipo_delivered',
      'new_anticipo_request',
      'new_gratificacion_request',
      'gratificacion_processed',
      'security_alert'
    ] as const;

    it('solo llegan al administrador', () => {
      const data = { monto: 50000, empleado: 'Lizeth Villa', nick: 'Lizi' };
      for (const type of sensibles) {
        expect(resolvePayload({ type, data, subscriber: admin })).toEqual(data);
        expect(canReceive({ type, data, subscriber: cajero })).toBe(false);
        expect(canReceive({ type, data, subscriber: anfitriona })).toBe(false);
        expect(canReceive({ type, data, subscriber: kiosk })).toBe(false);
      }
    });
  });

  describe('eventos dirigidos a un usuario', () => {
    it('solo los recibe el usuario afectado', () => {
      const data = { userId: 'u-ana' };
      expect(resolvePayload({ type: 'profile_updated', data, subscriber: anfitriona })).toEqual(
        data
      );
      expect(canReceive({ type: 'profile_updated', data, subscriber: cajero })).toBe(false);
      expect(canReceive({ type: 'profile_updated', data, subscriber: admin })).toBe(false);
    });

    it('compara ids sin importar el tipo', () => {
      expect(
        canReceive({
          type: 'profile_updated',
          data: { userId: 7 },
          subscriber: { channel: 'staff', userId: '7' }
        })
      ).toBe(true);
      expect(
        canReceive({
          type: 'profile_updated',
          data: { userId: '7' },
          subscriber: { channel: 'staff', userId: 7 }
        })
      ).toBe(true);
    });

    it('no los entrega si el payload no dice a quién van dirigidos', () => {
      expect(canReceive({ type: 'profile_updated', subscriber: cajero })).toBe(false);
      expect(
        canReceive({ type: 'profile_updated', data: { userId: null }, subscriber: cajero })
      ).toBe(false);
    });
  });

  describe('canal público del kiosko', () => {
    it('recibe el código de entrada y los avisos de asistencia', () => {
      expect(
        resolvePayload({ type: 'code_changed', data: { codigo: '4821' }, subscriber: kiosk })
      ).toEqual({ codigo: '4821' });
      expect(
        canReceive({
          type: 'attendance_registered',
          data: { user: { id: 'u-1' } },
          subscriber: kiosk
        })
      ).toBe(true);
    });

    it('nunca difunde la credencial del QR, aunque el emisor la incluya', () => {
      const frame = resolvePayload({
        type: 'attendance_registered',
        data: {
          user: { id: 'u-2', nombre: 'Ana', apellido: 'Perez' },
          qrToken: 'credencial-secreta'
        },
        subscriber: kiosk
      });
      expect(frame).toEqual({ user: { id: 'u-2', nombre: 'Ana', apellido: 'Perez' } });
      expect(JSON.stringify(frame)).not.toContain('credencial-secreta');
    });

    it('proyecta solo los campos declarados, no el payload entero', () => {
      const proyectado = resolvePayload({
        type: 'profile_updated',
        data: { userId: 'u-2', qr_token: 'otra-credencial', nick: 'Lizi' },
        subscriber: kiosk
      });
      expect(proyectado).toEqual({ userId: 'u-2' });
    });

    it('no le llega ningún evento sin proyección pública declarada', () => {
      const sinKiosk = SSE_EVENT_TYPES.filter(
        type => !SSE_EVENTS[type].audiences.some(audience => audience.channel === 'kiosk')
      );
      expect(sinKiosk.length).toBeGreaterThan(0);
      for (const type of sinKiosk) {
        expect(
          canReceive({
            type,
            data: { userId: 'u-1', user: { id: 'u-1' } },
            subscriber: kiosk
          })
        ).toBe(false);
      }
    });

    it('solo tres eventos llegan a la pantalla del local', () => {
      const conKiosk = SSE_EVENT_TYPES.filter(type =>
        SSE_EVENTS[type].audiences.some(audience => audience.channel === 'kiosk')
      );
      expect(conKiosk.sort()).toEqual(
        ['attendance_registered', 'code_changed', 'profile_updated'].sort()
      );
    });
  });

  describe('caché de autorización y sesión', () => {
    const staffSinAdmin = [cajero, anfitriona] as const;

    it("'permissions-updated' llega al personal que consume permisos, no al administrador", () => {
      const data = { roleId: 'rol-1' };
      for (const subscriber of staffSinAdmin) {
        expect(canReceive({ type: 'permissions-updated', data, subscriber })).toBe(true);
      }
      expect(canReceive({ type: 'permissions-updated', data, subscriber: admin })).toBe(false);
      expect(canReceive({ type: 'permissions-updated', data, subscriber: kiosk })).toBe(false);
    });

    it("'role-deleted' llega al personal con el roleId eliminado en el payload", () => {
      const data = { roleId: 'rol-7' };
      for (const subscriber of staffSinAdmin) {
        // Cada cliente compara su propio rol: el servidor no puede dirigirlo porque la
        // sesión no lleva roleId.
        expect(canReceive({ type: 'role-deleted', data, subscriber })).toBe(true);
      }
      expect(canReceive({ type: 'role-deleted', data, subscriber: admin })).toBe(false);
      expect(canReceive({ type: 'role-deleted', data, subscriber: kiosk })).toBe(false);
    });

    it("'force_logout' solo llega a la persona expulsada", () => {
      const data = { userId: 'u-ana', message: 'Volvé a entrar' };
      expect(resolvePayload({ type: 'force_logout', data, subscriber: anfitriona })).toEqual(data);
      expect(canReceive({ type: 'force_logout', data, subscriber: cajero })).toBe(false);
      expect(canReceive({ type: 'force_logout', data, subscriber: kiosk })).toBe(false);
    });
  });

  describe('pedidos y ventas anuladas', () => {
    it("'order_updated' es operativo: todo el personal, nunca el kiosko", () => {
      const data = { orderId: 'p-1', estado: 2, codigo: 'P-0001' };
      for (const subscriber of [cajero, anfitriona, admin, sinRol]) {
        expect(canReceive({ type: 'order_updated', data, subscriber })).toBe(true);
      }
      expect(canReceive({ type: 'order_updated', data, subscriber: kiosk })).toBe(false);
    });

    it("'sale_cancelled' es operativo: todo el personal, nunca el kiosko", () => {
      const data = { ventaId: 'v-1', total: 15000, cajaId: 'c-1' };
      for (const subscriber of [cajero, anfitriona, admin, sinRol]) {
        expect(canReceive({ type: 'sale_cancelled', data, subscriber })).toBe(true);
      }
      expect(canReceive({ type: 'sale_cancelled', data, subscriber: kiosk })).toBe(false);
    });
  });

  describe('normalizeRole', () => {
    it('acepta los roles reales sin importar mayúsculas ni espacios', () => {
      expect(normalizeRole(' Administrador ')).toBe('administrador');
      expect(normalizeRole('GARZON')).toBe('garzon');
      expect(normalizeRole('Barman')).toBe('barman');
    });

    it('rechaza vacíos y roles inexistentes', () => {
      expect(normalizeRole(null)).toBeNull();
      expect(normalizeRole('')).toBeNull();
      expect(normalizeRole('supervisor')).toBeNull();
    });
  });

  describe('isSseEventType', () => {
    it('distingue eventos declarados de inventados', () => {
      expect(isSseEventType('new_order')).toBe(true);
      expect(isSseEventType('evento_inventado')).toBe(false);
      expect(isSseEventType('constructor')).toBe(false);
    });
  });
});

describe('completitud del catálogo', () => {
  /**
   * Escanea los emisores reales para que el catálogo siga siendo la única fuente de verdad:
   * si alguien emite un evento sin declarar su audiencia, este test falla.
   */
  function collectEmittedEvents(): Map<string, string[]> {
    const emitidos = new Map<string, string[]>();
    const roots = ['app', 'lib'];

    const visit = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          visit(full);
          continue;
        }
        if (!/\.tsx?$/.test(entry.name) || entry.name.includes('.test.')) continue;

        const source = fs.readFileSync(full, 'utf8');
        let index = source.indexOf('sendNotificationToAll(');
        while (index !== -1) {
          const argumento = firstArgument(source, index + 'sendNotificationToAll('.length);
          for (const match of argumento.matchAll(/'([^']+)'/g)) {
            const nombre = match[1];
            emitidos.set(nombre, [...(emitidos.get(nombre) ?? []), path.relative('.', full)]);
          }
          index = source.indexOf('sendNotificationToAll(', index + 1);
        }
      }
    };

    for (const root of roots) visit(root);
    return emitidos;
  }

  /** Devuelve el primer argumento de una llamada, respetando paréntesis y literales. */
  function firstArgument(source: string, start: number): string {
    let depth = 0;
    let quote: string | null = null;
    for (let i = start; i < source.length; i++) {
      const char = source[i];
      if (quote) {
        if (char === '\\') i++;
        else if (char === quote) quote = null;
        continue;
      }
      if (char === "'" || char === '"' || char === '`') {
        quote = char;
        continue;
      }
      if (char === '(' || char === '[' || char === '{') depth++;
      if (char === ')' || char === ']' || char === '}') {
        if (depth === 0) return source.slice(start, i);
        depth--;
      }
      if (char === ',' && depth === 0) return source.slice(start, i);
    }
    return source.slice(start);
  }

  it('todo evento emitido en el código está declarado en el catálogo', () => {
    const emitidos = collectEmittedEvents();
    expect(emitidos.size).toBeGreaterThan(20);

    const sinDeclarar = [...emitidos.entries()]
      .filter(([nombre]) => !isSseEventType(nombre))
      .map(([nombre, archivos]) => `${nombre} (${archivos.join(', ')})`);

    expect(sinDeclarar).toEqual([]);
  });

  it('no declara eventos que nadie emite', () => {
    const emitidos = collectEmittedEvents();
    const huerfanos = SSE_EVENT_TYPES.filter(type => !emitidos.has(type));
    expect(huerfanos).toEqual([]);
  });
});
