import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

let mockAuthUser: any = null;
vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockImplementation(() => mockAuthUser)
}));

let mockDeviceId: string | null = null;
vi.mock('@/lib/kiosk/deviceAuth', () => ({
  getKioskDevice: vi.fn().mockImplementation(() => mockDeviceId)
}));

import { sendNotificationToAll, sseManager } from '@/lib/api/sseService';
import { GET as sseStaff } from '@/app/api/notifications/sse/route';
import { GET as sseKiosk } from '@/app/api/notifications/kiosk/route';
import { GET as sseOrders } from '@/app/api/orders/sse/route';

// jsdom aporta su propio AbortController, que no pasa la validación de Request (undici),
// así que los streams se cierran cancelando el reader y no con una señal.
const readers: ReadableStreamDefaultReader<Uint8Array>[] = [];

/** Abre un stream y devuelve los frames ya leídos. */
async function openStream(response: Response) {
  const reader = response.body!.getReader();
  readers.push(reader);
  const decoder = new TextDecoder();
  const frames: any[] = [];
  let buffer = '';

  const pull = async () => {
    while (true) {
      const separator = buffer.indexOf('\n\n');
      if (separator !== -1) {
        const raw = buffer.slice(0, separator);
        buffer = buffer.slice(separator + 2);
        if (raw.startsWith('data: ')) {
          frames.push(JSON.parse(raw.slice('data: '.length)));
          return frames[frames.length - 1];
        }
        continue;
      }
      const { value, done } = await reader.read();
      if (done) return null;
      buffer += decoder.decode(value, { stream: true });
    }
  };

  return { frames, pull, reader };
}

afterEach(async () => {
  for (const reader of readers) {
    await reader.cancel().catch(() => {});
  }
  readers.length = 0;
  mockAuthUser = null;
  mockDeviceId = null;
});

describe('GET /api/notifications/sse', () => {
  it('rechaza sin sesión y no registra ningún cliente', async () => {
    const response = await sseStaff(new Request('http://localhost/api/notifications/sse'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'NO_TOKEN' });
    expect(sseManager.clientCount).toBe(0);
  });

  it('entrega un stream autenticado y registra al cliente mientras dura', async () => {
    mockAuthUser = { id: 'u-ana', role: 'Anfitriona' };

    const response = await sseStaff(new Request('http://localhost/api/notifications/sse'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/event-stream');

    const stream = await openStream(response);
    expect(await stream.pull()).toMatchObject({ type: 'connected' });
    expect(sseManager.clientCount).toBe(1);

    await stream.reader.cancel();
    await vi.waitFor(() => expect(sseManager.clientCount).toBe(0));
  });

  it('solo recibe lo que su usuario y su rol permiten', async () => {
    mockAuthUser = { id: 'u-ana', role: 'Anfitriona' };
    const response = await sseStaff(new Request('http://localhost/api/notifications/sse'));
    const stream = await openStream(response);
    await stream.pull();

    sendNotificationToAll('profile_updated', { userId: 'u-otro' });
    sendNotificationToAll('ANTICIPO_PROCESSED', { monto: 90000 });

    // Ninguno de los dos le corresponde, así que el primero que llega es este.
    sendNotificationToAll('timers_updated', { timestamp: '2026-09-23 21:00:00' });
    expect(await stream.pull()).toMatchObject({ type: 'timers_updated' });
  });
});

describe('GET /api/orders/sse', () => {
  it('también exige sesión', async () => {
    const response = await sseOrders(new Request('http://localhost/api/orders/sse'));

    expect(response.status).toBe(401);
    expect(sseManager.clientCount).toBe(0);
  });
});

describe('GET /api/notifications/kiosk', () => {
  it('rechaza a una pantalla que no está vinculada', async () => {
    const response = await sseKiosk(new Request('http://localhost/api/notifications/kiosk'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: 'KIOSK_NOT_LINKED' });
    expect(sseManager.clientCount).toBe(0);
  });

  it('atiende a la pantalla provisionada, sin sesión de personal', async () => {
    mockDeviceId = 'device-1';
    const response = await sseKiosk(new Request('http://localhost/api/notifications/kiosk'));

    expect(response.status).toBe(200);
    const stream = await openStream(response);
    expect(await stream.pull()).toMatchObject({ type: 'connected' });
  });

  it('recibe la asistencia y el código, pero nada más', async () => {
    mockDeviceId = 'device-1';
    const response = await sseKiosk(new Request('http://localhost/api/notifications/kiosk'));
    const stream = await openStream(response);
    await stream.pull();

    sendNotificationToAll('attendance_registered', {
      user: { id: 'u-2', nombre: 'Ana', apellido: 'Perez' },
      qrToken: 'credencial-que-no-debe-salir'
    });
    sendNotificationToAll('security_alert', { message: 'intento de acceso' });
    sendNotificationToAll('new_order', { id: 'p-9', total: 50000 });

    const asistencia = await stream.pull();
    expect(asistencia).toMatchObject({
      type: 'attendance_registered',
      data: { user: { id: 'u-2', nombre: 'Ana', apellido: 'Perez' } }
    });
    expect(JSON.stringify(asistencia)).not.toContain('credencial-que-no-debe-salir');

    sendNotificationToAll('code_changed', { codigo: '7391' });
    expect(await stream.pull()).toMatchObject({
      type: 'code_changed',
      data: { codigo: '7391' }
    });
  });
});
describe('declaración de exposición en el middleware', () => {
  /** Lista de rutas declarada en un export, ignorando lo que esté comentado. */
  function parsePathList(source: string, exportName: string, siguiente: string): string[] {
    const start = source.indexOf(`export const ${exportName}`);
    const end = source.indexOf(`export const ${siguiente}`, start);
    const cuerpo = source.slice(start, end).replace(/\/\/[^\n]*/g, '');
    return [...cuerpo.matchAll(/'([^']+)'/g)].map(match => match[1]);
  }

  const routesSource = fs.readFileSync(path.resolve('lib/middleware/proxy-routes.ts'), 'utf8');
  const publicPaths = parsePathList(routesSource, 'PUBLIC_PATHS', 'KIOSK_DEVICE_APIS');
  const kioskDeviceApis = parsePathList(
    routesSource,
    'KIOSK_DEVICE_APIS',
    'AUTHENTICATED_ONLY_APIS'
  );

  it('ningún stream SSE queda declarado como público', () => {
    expect(publicPaths.filter(p => p.startsWith('/api/'))).not.toContain('/api/notifications/sse');
    expect(publicPaths).not.toContain('/api/notifications/kiosk');
    expect(publicPaths).not.toContain('/api/orders/sse');
  });

  it('la pantalla del local se declara como credencial de dispositivo', () => {
    expect(kioskDeviceApis).toContain('/api/kiosk');
    expect(kioskDeviceApis).toContain('/api/notifications/kiosk');
  });
});
