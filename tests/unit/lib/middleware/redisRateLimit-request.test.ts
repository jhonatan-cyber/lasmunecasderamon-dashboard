// @vitest-environment node
import { expect, it, vi } from 'vitest';

vi.mock('ioredis', () => ({
  default: class {
    on() {}
    async connect() {
      throw new Error('Redis unavailable');
    }
    disconnect() {}
  }
}));
vi.mock('@/lib/utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { checkRateLimit } from '@/lib/middleware/redisRateLimit';

it('limita una solicitud Request con cuerpo consumido usando el fallback sin Redis', async () => {
  const request = new Request('http://localhost/api/whatsapp/test', {
    method: 'POST',
    headers: { 'x-forwarded-for': '127.0.0.1', 'Content-Type': 'application/json' },
    body: '{}'
  });
  await request.json();
  const config = { prefix: 'whatsapp-request-test', max: 1, windowMs: 30_000 };
  expect((await checkRateLimit(request, config))?.allowed).toBe(true);
  expect(await checkRateLimit(request, config)).toMatchObject({ allowed: false, retryAfter: 30 });
});
