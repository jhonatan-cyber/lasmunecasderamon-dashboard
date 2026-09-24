import type RedisClient from 'ioredis';
import { createHash } from 'node:crypto';
import { redisNamespace } from '@/lib/cache/redisKeys';
import { logger } from '@/lib/utils/logger';

const RETRY_DELAY_MS = 5000;

// ─── Configuración ─────────────────────────────────────────────────

export interface FailedLoginConfig {
  /** Ventana en la que se cuentan los intentos fallidos. */
  windowMs: number;
  /** Intentos fallidos que disparan el bloqueo. */
  threshold: number;
  /** Duración del bloqueo. */
  lockoutMs: number;
}

export const FAILED_LOGIN: FailedLoginConfig = {
  windowMs: 15 * 60 * 1000,
  threshold: 5,
  lockoutMs: 15 * 60 * 1000
};

export interface FailedLoginOutcome {
  /** La cuenta está bloqueada en este momento. */
  blocked: boolean;
  /** Intentos acumulados en la ventana vigente (incluye este). */
  count: number;
  /** Intentos restantes antes del bloqueo (0 mientras está bloqueada). */
  remainingAttempts: number;
  /** Este intento acaba de disparar el bloqueo: la alerta se emite una sola vez. */
  justLocked: boolean;
}

interface MemoryEntry {
  count: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

// Registra el intento y, si alcanza el umbral, deja la cuenta bloqueada. Todo ocurre
// en un solo paso atómico para que dos instancias no puedan sobrepasar el umbral.
// Retorna {count, blocked, justLocked, lockTtlMs}.
const REGISTER_SCRIPT = `
if redis.call('EXISTS', KEYS[2]) == 1 then
  local lockedCount = tonumber(redis.call('GET', KEYS[2])) or 0
  return {lockedCount, 1, 0, redis.call('PTTL', KEYS[2])}
end

local count = redis.call('INCR', KEYS[1])
if redis.call('PTTL', KEYS[1]) < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end

if count >= tonumber(ARGV[2]) then
  redis.call('DEL', KEYS[1])
  redis.call('SET', KEYS[2], count, 'PX', ARGV[3])
  return {count, 1, 1, tonumber(ARGV[3])}
end

return {count, 0, 0, 0}
`;

/**
 * Contador de intentos fallidos de login en dos capas:
 *
 * - L1: `Map` en memoria por proceso. Respaldo cuando Redis no responde (comportamiento
 *   previo) y capa única si no hay `REDIS_URL` configurado.
 * - L2: Redis compartido entre instancias. Es la fuente de verdad mientras responda,
 *   de modo que el bloqueo por fuerza bruta no se pueda evadir repartiendo intentos
 *   entre instancias ni se pierda al reiniciar un proceso.
 */
export class RedisFailedLoginStore {
  private memory = new Map<string, MemoryEntry>();
  private client: RedisClient | null = null;
  private connecting: Promise<RedisClient | null> | null = null;
  private retryAt = 0;

  constructor(
    private readonly url: string | null,
    private readonly prefix: string,
    private readonly config: FailedLoginConfig = FAILED_LOGIN
  ) {}

  private counterKey(hashedIdentifier: string): string {
    return `${this.prefix}count:${hashedIdentifier}`;
  }

  private lockKey(hashedIdentifier: string): string {
    return `${this.prefix}lock:${hashedIdentifier}`;
  }

  private fail(client: RedisClient): void {
    client.disconnect();
    if (this.client === client) this.client = null;
    this.retryAt = Date.now() + RETRY_DELAY_MS;
    logger.warn('[FailedLogin] Redis no disponible; contando intentos por proceso');
  }

  private async connection(): Promise<RedisClient | null> {
    if (!this.url) return null;
    if (this.connecting) return this.connecting;
    if (this.client?.status === 'ready') return this.client;
    if (Date.now() < this.retryAt) return null;

    this.connecting = (async () => {
      let client: RedisClient | null = null;
      try {
        const Redis = (await import('ioredis')).default;
        client = new Redis(this.url!, {
          lazyConnect: true,
          enableOfflineQueue: false,
          connectTimeout: 1000,
          commandTimeout: 1000,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
          autoResendUnfulfilledCommands: false
        });
        client.on('error', () => {});
        this.client = client;
        await client.connect();
        return client;
      } catch {
        if (client) this.fail(client);
        else this.retryAt = Date.now() + RETRY_DELAY_MS;
        logger.info('[FailedLogin] Redis no disponible; contando intentos por proceso');
        return null;
      }
    })();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  private purgeExpired(now: number): void {
    for (const [key, entry] of this.memory.entries()) {
      const idle = now - entry.lastAttempt > this.config.windowMs;
      if (idle && (entry.lockedUntil === null || now >= entry.lockedUntil)) {
        this.memory.delete(key);
      }
    }
  }

  // ─── L1: respaldo en memoria ─────────────────────────────────────

  private memoryOutcome(key: string): FailedLoginOutcome {
    const now = Date.now();
    this.purgeExpired(now);
    const entry = this.memory.get(key);

    if (!entry || now - entry.lastAttempt > this.config.windowMs) {
      this.memory.set(key, { count: 1, lastAttempt: now, lockedUntil: null });
      return {
        blocked: false,
        count: 1,
        remainingAttempts: this.config.threshold - 1,
        justLocked: false
      };
    }

    if (entry.lockedUntil !== null && now < entry.lockedUntil) {
      return { blocked: true, count: entry.count, remainingAttempts: 0, justLocked: false };
    }

    if (entry.lockedUntil !== null) {
      // Bloqueo expirado: la ventana arranca de nuevo.
      entry.count = 0;
      entry.lockedUntil = null;
    }

    entry.count += 1;
    entry.lastAttempt = now;

    if (entry.count >= this.config.threshold) {
      entry.lockedUntil = now + this.config.lockoutMs;
      return { blocked: true, count: entry.count, remainingAttempts: 0, justLocked: true };
    }

    return {
      blocked: false,
      count: entry.count,
      remainingAttempts: this.config.threshold - entry.count,
      justLocked: false
    };
  }

  /**
   * Registra un intento fallido y responde si la cuenta queda bloqueada. Nunca lanza:
   * ante un fallo de Redis degrada al contador en memoria del proceso.
   */
  async register(identifier: string): Promise<FailedLoginOutcome> {
    const key = createHash('sha256')
      .update(identifier.trim().toLowerCase())
      .digest('hex')
      .slice(0, 32);

    const client = await this.connection();
    if (!client) return this.memoryOutcome(key);

    try {
      const result = await client.eval(
        REGISTER_SCRIPT,
        2,
        this.counterKey(key),
        this.lockKey(key),
        this.config.windowMs,
        this.config.threshold,
        this.config.lockoutMs
      );

      if (
        !Array.isArray(result) ||
        result.length !== 4 ||
        !result.every(value => Number.isInteger(value))
      ) {
        throw new Error('Respuesta inválida del contador de intentos');
      }

      const [count, blocked, justLocked, lockTtlMs] = result as [number, number, number, number];
      const isBlocked = blocked === 1;

      // Un bloqueo vigente se espeja en memoria: si Redis cae justo después, este
      // proceso sigue rechazando la cuenta durante lo que reste de bloqueo.
      if (isBlocked && lockTtlMs > 0) {
        this.memory.set(key, {
          count,
          lastAttempt: Date.now(),
          lockedUntil: Date.now() + lockTtlMs
        });
      }

      return {
        blocked: isBlocked,
        count,
        remainingAttempts: isBlocked ? 0 : Math.max(0, this.config.threshold - count),
        justLocked: justLocked === 1
      };
    } catch {
      this.fail(client);
      return this.memoryOutcome(key);
    }
  }

  close(): void {
    this.client?.disconnect();
    this.client = null;
  }
}

/**
 * Sin `REDIS_URL` el contador vive solo en memoria (comportamiento de un único
 * servidor), sin abrir conexiones contra un Redis inexistente.
 */
export const FailedLoginStore = new RedisFailedLoginStore(
  process.env.REDIS_URL ?? null,
  `lmr:loginfail:v1:${redisNamespace()}:`
);
