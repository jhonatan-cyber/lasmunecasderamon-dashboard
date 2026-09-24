import type RedisClient from 'ioredis';
import { createHash } from 'node:crypto';
import { redisNamespace } from './redisKeys';
import { logger } from '@/lib/utils/logger';

const RETRY_DELAY_MS = 5000;

export interface WindowCounterConfig {
  /** Duración de la ventana de conteo. */
  windowMs: number;
  /** Elementos que disparan el umbral. */
  threshold: number;
}

export interface WindowCounterOutcome {
  /** Elementos acumulados en la ventana vigente, incluido el actual. */
  items: string[];
  /** Cantidad de elementos acumulados (incluye el actual). */
  count: number;
  /** Se alcanzó el umbral y el contador quedó limpio para la próxima ventana. */
  triggered: boolean;
}

interface MemoryEntry {
  count: number;
  firstAt: number;
  items: string[];
}

// Cuenta y acumula en un paso atómico, con la ventana alineada en ambas claves: dos
// instancias no pueden superar el umbral entre ellas ni ver una lista incompleta.
// Retorna {count, triggered, ...items}.
const REGISTER_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end

redis.call('RPUSH', KEYS[2], ARGV[2])
redis.call('PEXPIRE', KEYS[2], ttl)

local items = redis.call('LRANGE', KEYS[2], 0, -1)
if count >= tonumber(ARGV[3]) then
  redis.call('DEL', KEYS[1], KEYS[2])
  return {count, 1, unpack(items)}
end

return {count, 0, unpack(items)}
`;

/**
 * Contador de eventos por ventana en dos capas:
 *
 * - L1: `Map` en memoria por proceso. Respaldo cuando Redis no responde (comportamiento
 *   previo) y capa única si no hay `REDIS_URL` configurado.
 * - L2: Redis compartido entre instancias. Es la fuente de verdad mientras responda, de
 *   modo que los umbrales no se multipliquen por el número de instancias ni se pierdan
 *   al reiniciar un proceso.
 */
export class RedisWindowCounter {
  private memory = new Map<string, MemoryEntry>();
  private client: RedisClient | null = null;
  private connecting: Promise<RedisClient | null> | null = null;
  private retryAt = 0;

  constructor(
    private readonly url: string | null,
    private readonly prefix: string,
    private readonly config: WindowCounterConfig
  ) {}

  private counterKey(hashedKey: string): string {
    return `${this.prefix}count:${hashedKey}`;
  }

  private itemsKey(hashedKey: string): string {
    return `${this.prefix}items:${hashedKey}`;
  }

  private fail(client: RedisClient): void {
    client.disconnect();
    if (this.client === client) this.client = null;
    this.retryAt = Date.now() + RETRY_DELAY_MS;
    logger.warn('[WindowCounter] Redis no disponible; contando por proceso');
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
        logger.info('[WindowCounter] Redis no disponible; contando por proceso');
        return null;
      }
    })();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  // ─── L1: respaldo en memoria ─────────────────────────────────────

  private purgeExpired(now: number): void {
    for (const [key, entry] of this.memory.entries()) {
      if (now - entry.firstAt > this.config.windowMs) this.memory.delete(key);
    }
  }

  private memoryOutcome(hashedKey: string, item: string): WindowCounterOutcome {
    const now = Date.now();
    this.purgeExpired(now);

    let entry = this.memory.get(hashedKey);
    if (!entry || now - entry.firstAt > this.config.windowMs) {
      entry = { count: 0, firstAt: now, items: [] };
      this.memory.set(hashedKey, entry);
    }

    entry.count += 1;
    entry.items.push(item);

    if (entry.count >= this.config.threshold) {
      // Limpiar evita alertas duplicadas: el siguiente evento abre ventana nueva.
      this.memory.delete(hashedKey);
      return { count: entry.count, items: [...entry.items], triggered: true };
    }

    return { count: entry.count, items: [...entry.items], triggered: false };
  }

  /**
   * Registra un evento en la ventana de `key` y responde si alcanzó el umbral.
   * Nunca lanza: ante un fallo de Redis degrada al contador en memoria del proceso.
   */
  async register(key: string, item: string): Promise<WindowCounterOutcome> {
    const hashedKey = createHash('sha256').update(key).digest('hex').slice(0, 32);

    const client = await this.connection();
    if (!client) return this.memoryOutcome(hashedKey, item);

    try {
      const result = await client.eval(
        REGISTER_SCRIPT,
        2,
        this.counterKey(hashedKey),
        this.itemsKey(hashedKey),
        this.config.windowMs,
        item,
        this.config.threshold
      );

      if (
        !Array.isArray(result) ||
        result.length < 2 ||
        !Number.isInteger(result[0]) ||
        result[0] < 1 ||
        !Number.isInteger(result[1])
      ) {
        throw new Error('Respuesta inválida del contador por ventana');
      }

      const [count, triggered, ...items] = result as [number, number, ...string[]];

      return {
        count,
        items: items.map(String),
        triggered: triggered === 1
      };
    } catch {
      this.fail(client);
      return this.memoryOutcome(hashedKey, item);
    }
  }

  /** Cantidad de contadores locales en memoria. */
  size(): number {
    return this.memory.size;
  }

  /**
   * Descarta solo el estado local en memoria (pruebas y apagado ordenado). Las claves
   * de Redis se conservan: siguen gobernadas por la ventana compartida.
   */
  clearMemory(): void {
    this.memory.clear();
  }

  close(): void {
    this.client?.disconnect();
    this.client = null;
  }
}

/**
 * Construye un contador con el namespace de la base de datos. Sin `REDIS_URL` el conteo
 * vive solo en memoria (comportamiento de un único servidor), sin abrir conexiones
 * contra un Redis inexistente.
 */
export function createWindowCounter(name: string, config: WindowCounterConfig): RedisWindowCounter {
  return new RedisWindowCounter(
    process.env.REDIS_URL ?? null,
    `lmr:${name}:v1:${redisNamespace()}:`,
    config
  );
}
