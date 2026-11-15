// ─── Rate Limiter simple en memoria ─────────────────────────────────────
// Limita la frecuencia de requests por IP para prevenir ataques de fuerza
// bruta y abuso de recursos. Usa un mapa en memoria con limpieza periódica.
// Para producción a gran escala, considerar Redis con @upstash/ratelimit.

interface RateLimitEntry {
  count: number;
  resetTime: number; // timestamp cuando se resetea
}

export class InMemoryRateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(
    private maxRequests: number = 60,
    private windowMs: number = 60 * 1000, // 60 segundos
    private cleanupMs: number = 300 * 1000 // limpiar cada 5 min
  ) {
    // Limpiar entradas expiradas periódicamente
    if (typeof window === 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), this.cleanupMs);
      (this.cleanupInterval as NodeJS.Timeout).unref();
    }
  }

  /**
   * Verifica si una IP ha excedido el límite.
   * Retorna { allowed: boolean, remaining: number, resetIn: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetIn: number; limit: number } {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // Ventana expirada o primera petición
      this.store.set(key, { count: 1, resetTime: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetIn: this.windowMs,
        limit: this.maxRequests
      };
    }

    entry.count++;

    if (entry.count > this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
        limit: this.maxRequests
      };
    }

    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetIn: entry.resetTime - now,
      limit: this.maxRequests
    };
  }

  /** Elimina entradas expiradas para liberar memoria */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /** Destruye el limiter y libera recursos */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Instancias pre-configuradas para diferentes tipos de endpoints
export const rateLimiters = {
  /** Rate limit general: 60 req/min por IP */
  general: new InMemoryRateLimiter(60, 60 * 1000),

  /** Rate limit estricto para auth: 10 req/min por IP */
  auth: new InMemoryRateLimiter(10, 60 * 1000),

  /** Rate limit para mutaciones: 30 req/min por IP */
  mutation: new InMemoryRateLimiter(30, 60 * 1000),

  /** Rate limit relajado para lecturas: 120 req/min por IP */
  read: new InMemoryRateLimiter(120, 60 * 1000)
};

/**
 * Middleware para aplicar rate limiting en una ruta.
 * Retorna una Response 429 si se excede el límite, o null si está permitido.
 */
export function withRateLimit(
  request: Request,
  limiter: InMemoryRateLimiter = rateLimiters.general
): { response: Response | null; remaining: number; resetIn: number } | null {
  // Obtener IP del cliente
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  // En desarrollo, saltar rate limiting
  if (process.env.NODE_ENV === 'development') {
    return null;
  }

  const result = limiter.check(ip);

  if (!result.allowed) {
    return {
      response: new Response(
        JSON.stringify({
          success: false,
          message: 'Demasiadas solicitudes. Por favor, espera antes de intentar nuevamente.',
          code: 'RATE_LIMIT_EXCEEDED',
          resetIn: result.resetIn
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': String(Math.ceil(result.resetIn / 1000)),
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000))
          }
        }
      ),
      remaining: 0,
      resetIn: result.resetIn
    };
  }

  return {
    response: null,
    remaining: result.remaining,
    resetIn: result.resetIn
  };
}
