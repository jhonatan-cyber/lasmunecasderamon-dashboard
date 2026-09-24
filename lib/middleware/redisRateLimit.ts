import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import type RedisClient from 'ioredis';

// ─── Tipos ─────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  /** Redis key prefix */
  prefix: string;
}

// ─── Almacenamiento en memoria (fallback) ──────────────────────────

const memoryStore = new Map<string, { count: number; resetTime: number }>();

function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, value] of memoryStore.entries()) {
    if (now > value.resetTime) {
      memoryStore.delete(key);
    }
  }
}

// ─── Logger de rate limit ──────────────────────────────────────────

function logRateLimitExceeded(ip: string, path: string, config: RateLimitConfig): void {
  logger.warn('[RateLimit] Excedido', {
    ip,
    path,
    limit: config.max,
    windowMs: config.windowMs,
    userAgent: 'server'
  });
}

// ─── Cliente Redis singleton (solo Node.js, no Edge) ───────────────

let redisClient: RedisClient | null = null;
let connecting: Promise<RedisClient | null> | null = null;
let retryAt = 0;
const RETRY_DELAY_MS = 5000;

function discardClient(client: RedisClient): void {
  client.disconnect();
  if (redisClient === client) redisClient = null;
  retryAt = Date.now() + RETRY_DELAY_MS;
}

async function getRedisClient(): Promise<RedisClient | null> {
  if (connecting) return connecting;
  if (redisClient?.status === 'ready') return redisClient;
  if (Date.now() < retryAt) return null;

  connecting = (async () => {
    let client: RedisClient | null = null;
    try {
      const Redis = (await import('ioredis')).default;
      client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        commandTimeout: 2000,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null,
        autoResendUnfulfilledCommands: false
      });
      // Los fallos se manejan en las promesas; evitar eventos error sin listener.
      client.on('error', () => {});
      redisClient = client;
      await client.connect();
      await client.ping();
      logger.info('[RateLimit] Redis conectado exitosamente');
      return client;
    } catch {
      if (client) discardClient(client);
      else retryAt = Date.now() + RETRY_DELAY_MS;
      logger.info('[RateLimit] Redis no disponible; usando memoria, se reintentará en 5s');
      return null;
    }
  })();
  try {
    return await connecting;
  } finally {
    connecting = null;
  }
}

// Incremento y expiración indivisibles, incluso con solicitudes concurrentes.
const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('TTL', KEYS[1])
if ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

// ─── Verificación con Redis (INCR + EXPIRE) ────────────────────────

async function checkRedisRateLimit(
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const client = await getRedisClient();
  if (!client) return null;

  try {
    const redisKey = `rl:${config.prefix}:${key}`;
    const windowSec = Math.ceil(config.windowMs / 1000);

    const result = await client.eval(RATE_LIMIT_SCRIPT, 1, redisKey, windowSec);
    if (
      !Array.isArray(result) ||
      result.length !== 2 ||
      !Number.isInteger(result[0]) ||
      result[0] < 1 ||
      !Number.isInteger(result[1]) ||
      result[1] < 0
    ) {
      throw new Error('Respuesta inválida del limitador Redis');
    }
    const [count, ttl] = result as [number, number];
    const remaining = Math.max(0, config.max - Number(count));
    const reset = Math.floor(Date.now() / 1000) + Number(ttl);

    return {
      allowed: Number(count) <= config.max,
      limit: config.max,
      remaining,
      reset,
      retryAfter: !(Number(count) <= config.max) ? Number(ttl) : undefined
    };
  } catch (err) {
    discardClient(client);
    logger.error('[RateLimit] Error en Redis', {
      error: err instanceof Error ? err.message : String(err)
    });
    return null; // Fallback a memoria
  }
}

// ─── Verificación en memoria (fallback) ────────────────────────────

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupMemoryStore();
  key = `${config.prefix}:${key}`;

  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now >= entry.resetTime) {
    // Nueva ventana
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return {
      allowed: true,
      limit: config.max,
      remaining: config.max - 1,
      reset: Math.ceil((now + config.windowMs) / 1000)
    };
  }

  if (entry.count >= config.max) {
    const retryAfter = Math.max(0, Math.ceil((entry.resetTime - now) / 1000));
    return {
      allowed: false,
      limit: config.max,
      remaining: 0,
      reset: Math.ceil(entry.resetTime / 1000),
      retryAfter
    };
  }

  entry.count++;
  return {
    allowed: true,
    limit: config.max,
    remaining: config.max - entry.count,
    reset: Math.ceil(entry.resetTime / 1000)
  };
}

// ─── Función principal de rate limiting ────────────────────────────

export async function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): Promise<RateLimitResult | null> {
  const forwarded = request.headers.get('x-forwarded-for');
  const clientIP = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
  const pathname = request.nextUrl.pathname;

  // Key por IP + ruta para granularidad
  const key = `${clientIP}:${pathname}`;

  // Intentar con Redis primero
  const redisResult = await checkRedisRateLimit(key, config);
  if (redisResult !== null) {
    if (!redisResult.allowed) {
      logRateLimitExceeded(clientIP, pathname, config);
    }
    return redisResult;
  }

  // Fallback a memoria
  const memoryResult = checkMemoryRateLimit(key, config);
  if (!memoryResult.allowed) {
    logRateLimitExceeded(clientIP, pathname, config);
  }
  return memoryResult;
}

// ─── Middleware para usar en API routes (NextRequest) ──────────────

export function withRedisRateLimit(config: RateLimitConfig) {
  return async function rateLimitMiddleware(
    request: NextRequest,
    handler: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const result = await checkRateLimit(request, config);

    if (!result || !result.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(result?.retryAfter ?? 60),
            'RateLimit-Limit': String(config.max),
            'RateLimit-Remaining': '0',
            'RateLimit-Reset': String(result?.reset ?? Math.ceil(Date.now() / 1000) + 60)
          }
        }
      );
    }

    const response = await handler();
    response.headers.set('RateLimit-Limit', String(result.limit));
    response.headers.set('RateLimit-Remaining', String(result.remaining));
    response.headers.set('RateLimit-Reset', String(result.reset));
    return response;
  };
}

// ─── Configuraciones predefinidas ──────────────────────────────────

export const RATE_LIMIT_CONFIGS = {
  /** Login: 5 requests por minuto por IP */
  LOGIN: { windowMs: 60 * 1000, max: 5, prefix: 'login' },
  /** API general: 100 requests por 15 minutos por IP */
  API_GENERAL: { windowMs: 15 * 60 * 1000, max: 100, prefix: 'api' },
  /** API sensibles (crear/editar/eliminar): 20 requests por 5 minutos */
  API_SENSITIVE: { windowMs: 5 * 60 * 1000, max: 20, prefix: 'sensitive' },
  /** SSE/WebSocket: 10 conexiones por minuto (evita flooding) */
  SSE: { windowMs: 60 * 1000, max: 10, prefix: 'sse' }
} as const;

const redisRateLimit = { checkRateLimit, withRedisRateLimit, RATE_LIMIT_CONFIGS };
export default redisRateLimit;
