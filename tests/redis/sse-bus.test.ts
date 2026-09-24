import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Redis from 'ioredis';
import {
  publishSseEvent,
  startSseBus,
  stopSseBus,
  sseBusChannel,
  waitForSseBus
} from '@/lib/api/sseBus';

vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

const URL = 'redis://127.0.0.1:6379';
const extra: Redis[] = [];
let direct: Redis;

const otherInstance = (): Redis => {
  const client = new Redis(URL, { retryStrategy: () => null });
  extra.push(client);
  return client;
};

beforeEach(async () => {
  vi.stubEnv('REDIS_URL', URL);
  direct = new Redis(URL, { retryStrategy: () => null });
  await direct.ping();
});

afterEach(() => {
  stopSseBus();
  for (const client of extra) client.disconnect();
  extra.length = 0;
  direct.disconnect();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

it('publica en el canal compartido con el origen de la instancia', async () => {
  const received: string[] = [];
  const listener = otherInstance();
  listener.on('message', (_channel, raw) => received.push(raw));
  await listener.subscribe(sseBusChannel());

  startSseBus(vi.fn());
  await waitForSseBus();

  publishSseEvent('new_order', { id: 'p-1' }, '2026-09-24 10:00:00');

  await vi.waitFor(() => expect(received.length).toBeGreaterThan(0));
  const envelope = JSON.parse(received[0]);
  expect(envelope).toMatchObject({
    type: 'new_order',
    data: { id: 'p-1' },
    timestamp: '2026-09-24 10:00:00'
  });
  expect(typeof envelope.origin).toBe('string');
  expect(envelope.origin.length).toBeGreaterThan(0);
});

it('entrega lo que publican otras instancias y descarta lo propio', async () => {
  const handler = vi.fn();
  startSseBus(handler);
  await waitForSseBus();

  const other = otherInstance();
  await other.publish(
    sseBusChannel(),
    JSON.stringify({
      type: 'force_logout',
      data: { userId: 'u-9' },
      timestamp: 't1',
      origin: 'otra-instancia'
    })
  );

  await vi.waitFor(() =>
    expect(handler).toHaveBeenCalledWith('force_logout', { userId: 'u-9' }, 't1')
  );

  // Un evento propio ya se entregó localmente: no debe reprocesarse desde el bus.
  publishSseEvent('new_order', { id: 'p-2' }, 't2');
  await new Promise(resolve => setTimeout(resolve, 150));
  expect(handler.mock.calls.map(call => call[0])).not.toContain('new_order');
});

it('ignora eventos desconocidos o malformados', async () => {
  const handler = vi.fn();
  startSseBus(handler);
  await waitForSseBus();

  const other = otherInstance();
  await other.publish(sseBusChannel(), 'no-es-json');
  await other.publish(
    sseBusChannel(),
    JSON.stringify({ type: 'evento-inexistente', data: {}, timestamp: 't', origin: 'otra' })
  );

  await new Promise(resolve => setTimeout(resolve, 150));
  expect(handler).not.toHaveBeenCalled();
});

it('reparte a los clientes SSE locales un evento de otra instancia', async () => {
  const { sseManager } = await import('@/lib/api/sseService');
  const frames: any[] = [];
  const writer = {
    write(chunk: string) {
      frames.push(JSON.parse(chunk.replace(/^data: /, '')));
    },
    close() {},
    onClose() {}
  };
  const context = { channel: 'staff' as const, userId: 'u-1', role: 'cajero' };
  sseManager.registerClient(writer, context);

  await waitForSseBus();

  const other = otherInstance();
  await other.publish(
    sseBusChannel(),
    JSON.stringify({
      type: 'new_order',
      data: { id: 'p-3' },
      timestamp: 't3',
      origin: 'otra-instancia'
    })
  );

  await vi.waitFor(() => expect(frames.some(frame => frame.type === 'new_order')).toBe(true));
  const frame = frames.find(f => f.type === 'new_order');
  expect(frame.data).toEqual({ id: 'p-3' });
  expect(frame.timestamp).toBe('t3');

  sseManager.unregisterClient(writer);
});
