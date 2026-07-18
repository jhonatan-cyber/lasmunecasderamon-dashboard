import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';

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

let redisClient: any = null;
let redisAvailable = false;
let redisCheckDone = false;

async function getRedisClient(): Promise<any> {
  if (redisCheckDone) return redisAvailable ? redisClient : null;
  redisCheckDone = true;

  try {
    // ioredis usa TCP (net) — no funciona en Edge Runtime.
    // En Node.js (API routes) funciona perfectamente.
    const Redis = (await import('ioredis')).default;
    redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 2000
    });

    // Probar conexión rápida
    await redisClient.connect();
    await redisClient.ping();
    redisAvailable = true;
    logger.info('[RateLimit] Redis conectado exitosamente');
  } catch {
    // Edge Runtime o Redis no disponible — usar fallback en memoria
    redisAvailable = false;
    redisClient = null;
    if (process.env.NODE_ENV !== 'test') {
      logger.info('[RateLimit] Redis no disponible, usando fallback en memoria');
    }
  }

  return redisAvailable ? redisClient : null;
}

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

    // INCR + EXPIRE en pipeline para atomicidad
    const results = await client
      .pipeline()
      .incr(redisKey)
      .expire(redisKey, windowSec, 'NX')
      .ttl(redisKey)
      .exec();

    // Resultados: [ [null, count], [null, expireSet], [null, ttl] ]
    const count = results?.[0]?.[1] ?? 0;
    const ttl = results?.[2]?.[1] ?? windowSec;
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
    logger.error('[RateLimit] Error en Redis', {
      error: err instanceof Error ? err.message : String(err)
    });
    return null; // Fallback a memoria
  }
}

// ─── Verificación en memoria (fallback) ────────────────────────────

function checkMemoryRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupMemoryStore();

  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetTime) {
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
  SSE: { windowMs: 60 * 1000, max: 10, prefix: 'sse' },
  /** Auth endpoints estricto: 3 requests por minuto */
  AUTH_STRICT: { windowMs: 60 * 1000, max: 3, prefix: 'auth-strict' }
} as const;

export default { checkRateLimit, withRedisRateLimit, RATE_LIMIT_CONFIGS };
