import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createRateLimiter } from '@/lib/middleware/rateLimit';
import type { NextApiRequest, NextApiResponse } from 'next';

type MockResponse = NextApiResponse & {
  headers: Record<string, string>;
  data: any;
};

function createMockRequest(ip: string = '127.0.0.1'): NextApiRequest {
  return {
    headers: {
      'x-forwarded-for': ip,
      'user-agent': 'test-agent'
    },
    connection: {
      remoteAddress: ip
    } as any,
    socket: {
      remoteAddress: ip
    } as any,
    url: '/api/test',
    method: 'POST'
  } as unknown as NextApiRequest;
}

function createMockResponse(): MockResponse {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    data: null as any,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.data = data;
      return this;
    },
    setHeader(key: string, value: string) {
      this.headers[key] = value;
      return this;
    }
  };

  return res as unknown as MockResponse;
}

describe('createRateLimiter', () => {
  const limiter = createRateLimiter(60000, 3);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should allow requests within the limit', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ success: true }));
    const wrapped = limiter(handler);

    const req1 = createMockRequest('192.168.1.1');
    const res1 = createMockResponse();

    await wrapped(req1, res1);

    expect(handler).toHaveBeenCalled();
    expect(res1.statusCode).toBe(200);
  });

  it('should block requests exceeding the limit', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ success: true }));
    const wrapped = limiter(handler);
    const ip = '192.168.1.2';

    for (let i = 0; i < 3; i++) {
      const req = createMockRequest(ip);
      const res = createMockResponse();
      await wrapped(req, res);
    }

    const req4 = createMockRequest(ip);
    const res4 = createMockResponse();
    await wrapped(req4, res4);

    expect(res4.statusCode).toBe(429);
    expect(res4.data.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should set RateLimit headers', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ success: true }));
    const wrapped = limiter(handler);

    const req = createMockRequest('192.168.1.3');
    const res = createMockResponse();

    await wrapped(req, res);

    expect(res.headers['RateLimit-Limit']).toBeDefined();
    expect(res.headers['RateLimit-Remaining']).toBeDefined();
    expect(res.headers['RateLimit-Reset']).toBeDefined();
  });

  it('should track different IPs separately', async () => {
    const handler = vi.fn((req, res) => res.status(200).json({ success: true }));
    const wrapped = limiter(handler);

    for (let i = 0; i < 3; i++) {
      const req = createMockRequest('192.168.1.10');
      const res = createMockResponse();
      await wrapped(req, res);
    }

    const req2 = createMockRequest('192.168.1.11');
    const res2 = createMockResponse();
    await wrapped(req2, res2);

    expect(res2.statusCode).toBe(200);
  });

  it('should reset after window expires', async () => {
    vi.useFakeTimers();

    const shortLimiter = createRateLimiter(1000, 2);
    const handler = vi.fn((req, res) => res.status(200).json({ success: true }));
    const wrapped = shortLimiter(handler);

    const ip = '192.168.2.1';

    for (let i = 0; i < 2; i++) {
      const req = createMockRequest(ip);
      const res = createMockResponse();
      await wrapped(req, res);
    }

    const req3 = createMockRequest(ip);
    const res3 = createMockResponse();
    await wrapped(req3, res3);
    expect(res3.statusCode).toBe(429);

    vi.advanceTimersByTime(1100);

    const req4 = createMockRequest(ip);
    const res4 = createMockResponse();
    await wrapped(req4, res4);
    expect(res4.statusCode).toBe(200);

    vi.useRealTimers();
  });
});
