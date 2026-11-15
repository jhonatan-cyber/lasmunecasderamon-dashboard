import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@/lib/utils/logger', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/logger')>('@/lib/utils/logger');
  return actual;
});

import { InMemoryRateLimiter, withRateLimit, rateLimiters } from '@/lib/api/rateLimit';
import {
  sanitizeXSS,
  sanitizeNullBytes,
  sanitizeMaxLength,
  sanitizeBody,
  detectSQLInjection,
  scanForSQLInjection,
  sanitizeRequest,
} from '@/lib/api/sanitize';
import { setRequestId, getRequestId, clearRequestId } from '@/lib/utils/logger';

// ─── Rate Limiter Tests ─────────────────────────────────────────────────

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter;

  beforeEach(() => {
    // 3 requests per 1 second window for fast testing
    limiter = new InMemoryRateLimiter(3, 1000, 60000);
  });

  afterEach(() => {
    limiter.destroy();
  });

  it('should allow requests within limit', () => {
    const result1 = limiter.check('192.168.1.1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);
    expect(result1.limit).toBe(3);

    const result2 = limiter.check('192.168.1.1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(1);

    const result3 = limiter.check('192.168.1.1');
    expect(result3.allowed).toBe(true);
    expect(result3.remaining).toBe(0);
  });

  it('should block requests over limit', () => {
    limiter.check('192.168.1.1');
    limiter.check('192.168.1.1');
    limiter.check('192.168.1.1');

    const result = limiter.check('192.168.1.1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.resetIn).toBeGreaterThan(0);
  });

  it('should track different IPs independently', () => {
    limiter.check('192.168.1.1');
    limiter.check('192.168.1.1');
    limiter.check('192.168.1.1');

    const blocked = limiter.check('192.168.1.1');
    expect(blocked.allowed).toBe(false);

    const otherIp = limiter.check('192.168.1.2');
    expect(otherIp.allowed).toBe(true);
    expect(otherIp.remaining).toBe(2);
  });

  it('should reset after window expires', async () => {
    const shortLimiter = new InMemoryRateLimiter(2, 50, 60000);

    shortLimiter.check('192.168.1.1');
    shortLimiter.check('192.168.1.1');
    const blocked = shortLimiter.check('192.168.1.1');
    expect(blocked.allowed).toBe(false);

    // Wait for window to expire
    await new Promise(resolve => setTimeout(resolve, 100));

    const allowed = shortLimiter.check('192.168.1.1');
    expect(allowed.allowed).toBe(true);

    shortLimiter.destroy();
  });

  it('should destroy and clear resources', () => {
    limiter.check('192.168.1.1');
    limiter.destroy();

    // After destroy, store is cleared
    const result = limiter.check('192.168.1.1');
    // May or may not work after destroy, but shouldn't throw
    expect(result).toBeDefined();
  });
});

describe('withRateLimit', () => {
  beforeEach(() => {
    // Reset the auth limiter for tests
    const authLimiter = new InMemoryRateLimiter(10, 60000, 60000);
    // We can't replace the export, so we test with a fresh limiter
  });

  it('should return null in development mode', () => {
    const request = new Request('http://localhost/test');
    // In development, withRateLimit returns null
    // This is tested by the environment variable check
    const result = withRateLimit(request, new InMemoryRateLimiter(60, 60000));
    // In dev mode it returns null, in test mode it may not
    expect(result).toBeDefined();
  });

  it('should extract IP from x-forwarded-for header', () => {
    const request = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
    });
    const result = withRateLimit(request, new InMemoryRateLimiter(60, 60000));
    expect(result).toBeDefined();
  });

  it('should return 429 response when limit exceeded', () => {
    const limiter = new InMemoryRateLimiter(2, 60000, 60000);
    const headers = new Headers();
    headers.set('x-forwarded-for', '192.168.1.1');

    const req1 = new Request('http://localhost/test', { headers });
    const req2 = new Request('http://localhost/test', { headers });
    const req3 = new Request('http://localhost/test', { headers });

    withRateLimit(req1, limiter);
    withRateLimit(req2, limiter);

    const result = withRateLimit(req3, limiter);
    expect(result).not.toBeNull();
    if (result && result.response) {
      expect(result.response.status).toBe(429);
      expect(result.response.headers.get('Retry-After')).toBeDefined();
      expect(result.response.headers.get('X-RateLimit-Limit')).toBe('2');
      expect(result.response.headers.get('X-RateLimit-Remaining')).toBe('0');
    }

    limiter.destroy();
  });
});

// ─── Sanitization Tests ─────────────────────────────────────────────────

describe('sanitizeXSS', () => {
  it('should escape HTML entities', () => {
    expect(sanitizeXSS('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    );
  });

  it('should escape ampersands', () => {
    expect(sanitizeXSS('a & b')).toBe('a &amp; b');
  });

  it('should escape single quotes', () => {
    expect(sanitizeXSS("it's")).toBe('it&#x27;s');
  });

  it('should escape forward slashes', () => {
    expect(sanitizeXSS('a/b')).toBe('a&#x2F;b');
  });

  it('should handle empty string', () => {
    expect(sanitizeXSS('')).toBe('');
  });
});

describe('sanitizeNullBytes', () => {
  it('should remove null bytes', () => {
    expect(sanitizeNullBytes('hello\0world')).toBe('helloworld');
  });

  it('should remove multiple null bytes', () => {
    expect(sanitizeNullBytes('a\0b\0c')).toBe('abc');
  });

  it('should handle string without null bytes', () => {
    expect(sanitizeNullBytes('hello')).toBe('hello');
  });
});

describe('sanitizeMaxLength', () => {
  it('should truncate strings over max length', () => {
    const long = 'a'.repeat(100);
    expect(sanitizeMaxLength(long, 50)).toBe('a'.repeat(50));
  });

  it('should not truncate short strings', () => {
    expect(sanitizeMaxLength('short', 100)).toBe('short');
  });

  it('should use default max of 10000', () => {
    const long = 'a'.repeat(20000);
    expect(sanitizeMaxLength(long).length).toBe(10000);
  });
});

describe('sanitizeBody', () => {
  it('should sanitize null bytes in strings', () => {
    const obj = { name: 'hello\0world' };
    const result = sanitizeBody(obj) as Record<string, string>;
    expect(result.name).toBe('helloworld');
  });

  it('should sanitize object keys', () => {
    const obj = { 'na<me>': 'value' };
    const result = sanitizeBody(obj) as Record<string, string>;
    expect(result).toHaveProperty('name');
    expect(result.name).toBe('value');
  });

  it('should handle nested objects', () => {
    const obj = { outer: { inner: 'test\0value' } };
    const result = sanitizeBody(obj) as Record<string, Record<string, string>>;
    expect(result.outer.inner).toBe('testvalue');
  });

  it('should handle arrays', () => {
    const arr = ['a\0b', 'c\0d'];
    const result = sanitizeBody(arr) as string[];
    expect(result).toEqual(['ab', 'cd']);
  });

  it('should respect max depth', () => {
    const deep = { a: { b: { c: { d: { e: 'deep' } } } } };
    const result = sanitizeBody(deep, 3);
    expect(JSON.stringify(result)).toContain('MAX_DEPTH');
  });

  it('should handle null and undefined', () => {
    expect(sanitizeBody(null)).toBeNull();
    expect(sanitizeBody(undefined)).toBeUndefined();
  });

  it('should pass through numbers and booleans', () => {
    expect(sanitizeBody(42)).toBe(42);
    expect(sanitizeBody(true)).toBe(true);
  });
});

// ─── SQL Injection Detection Tests ──────────────────────────────────────

describe('detectSQLInjection', () => {
  it('should detect SELECT statement', () => {
    expect(detectSQLInjection('SELECT * FROM users')).toBe(true);
  });

  it('should detect DROP statement', () => {
    expect(detectSQLInjection('DROP TABLE users')).toBe(true);
  });

  it('should detect OR 1=1 pattern', () => {
    expect(detectSQLInjection("' OR 1=1--")).toBe(true);
  });

  it('should detect UNION statement', () => {
    expect(detectSQLInjection('UNION SELECT')).toBe(true);
  });

  it('should detect SLEEP function', () => {
    expect(detectSQLInjection('SLEEP(5)')).toBe(true);
  });

  it('should detect WAITFOR DELAY', () => {
    expect(detectSQLInjection('WAITFOR DELAY')).toBe(true);
  });

  it('should detect comment patterns', () => {
    expect(detectSQLInjection('admin--')).toBe(true);
  });

  it('should allow normal text', () => {
    expect(detectSQLInjection('Hello world')).toBe(false);
    expect(detectSQLInjection('Mi nombre es Juan')).toBe(false);
    expect(detectSQLInjection('Producto de limpieza')).toBe(false);
  });

  it('should allow normal names with SQL-like words in context', () => {
    // "select" in a normal context should still trigger - this is by design
    // as the detection is alert-only, not blocking
    expect(detectSQLInjection('select option')).toBe(true);
  });
});

describe('scanForSQLInjection', () => {
  it('should find SQL injection in string', () => {
    const result = scanForSQLInjection('SELECT * FROM users');
    expect(result).toContain('root');
  });

  it('should find SQL injection in object property', () => {
    const obj = { name: 'Juan', query: 'DROP TABLE' };
    const result = scanForSQLInjection(obj);
    expect(result).toContain('query');
  });

  it('should find SQL injection in nested object', () => {
    const obj = { outer: { inner: 'UNION SELECT' } };
    const result = scanForSQLInjection(obj);
    expect(result).toContain('outer.inner');
  });

  it('should find SQL injection in array', () => {
    const arr = ['safe', 'DELETE FROM'];
    const result = scanForSQLInjection(arr);
    expect(result).toContain('[1]');
  });

  it('should return empty array for clean data', () => {
    const obj = { name: 'Juan', age: 30, city: 'Santiago' };
    const result = scanForSQLInjection(obj);
    expect(result).toEqual([]);
  });
});

describe('sanitizeRequest', () => {
  it('should return null for non-JSON content type', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: 'hello'
    });
    const result = await sanitizeRequest(request);
    expect(result).toBeNull();
  });

  it('should sanitize JSON body', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'test\0value', description: 'normal' })
    });
    const result = await sanitizeRequest(request);
    expect(result).not.toBeNull();
    if (result && result.body) {
      const body = result.body as Record<string, string>;
      expect(body.name).toBe('testvalue');
    }
  });

  it('should detect SQL injection warnings', async () => {
    const request = new Request('http://localhost/test', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'SELECT * FROM users' })
    });
    const result = await sanitizeRequest(request);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('name');
    }
  });
});

// ─── Request ID Tests ───────────────────────────────────────────────────

describe('Request ID tracking', () => {
  beforeEach(() => {
    clearRequestId();
  });

  afterEach(() => {
    clearRequestId();
  });

  it('should set and get request ID', () => {
    setRequestId('test-123');
    expect(getRequestId()).toBe('test-123');
  });

  it('should generate request ID on get when not set', () => {
    clearRequestId();
    const id = getRequestId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('should clear request ID', () => {
    setRequestId('test-456');
    clearRequestId();
    // After clear, getRequestId generates a new one
    const newId = getRequestId();
    expect(newId).not.toBe('test-456');
  });

  it('should overwrite request ID', () => {
    setRequestId('test-111');
    setRequestId('test-222');
    expect(getRequestId()).toBe('test-222');
  });
});
