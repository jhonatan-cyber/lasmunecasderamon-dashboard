import type RedisClient from 'ioredis';
import { createHash, randomUUID } from 'node:crypto';
import type { UserPermissions } from '@/lib/middleware/auth';
import { logger } from '@/lib/utils/logger';

const TTL_MS = 60 * 1000;
const RETRY_DELAY_MS = 5000;

interface CacheEntry {
  permissions: UserPermissions;
  expiresAt: number;
}

// Resuelve la generación vigente y devuelve el valor guardado bajo ella en una sola
// ida y vuelta. La generación separa los permisos cacheados antes y después de una
// invalidación global, de modo que un proceso lento no repueble datos obsoletos.
const READ_SCRIPT = `
local generation = redis.call('GET', KEYS[1])
if not generation then
  generation = ARGV[1]
  redis.call('SET', KEYS[1], generation)
end
local value = redis.call('GET', KEYS[2] .. generation .. ':' .. ARGV[2])
return {generation, value}
`;

// Solo guarda si la generación sigue siendo la observada al calcular los permisos;
// si otro proceso invalidó en el intermedio, el valor se descarta (clave huérfana).
const WRITE_SCRIPT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2] .. ARGV[1] .. ':' .. ARGV[2], ARGV[3], 'PX', ARGV[4])
return 1
`;

// Borra el valor de la generación vigente; el resto de procesos falla la lectura y
// vuelve a resolver los permisos, propagando la invalidación sin tocar su estado.
const DELETE_SCRIPT = `
local generation = redis.call('GET', KEYS[1])
if not generation then return 0 end
return redis.call('DEL', KEYS[2] .. generation .. ':' .. ARGV[1])
`;

/**
 * Caché de permisos en dos capas:
 *
 * - L1: `Map` en memoria por proceso (síncrona). Se usa como respaldo cuando Redis
 *   no está disponible y para mantener la API síncrona existente.
 * - L2: Redis compartido entre procesos, con una generación que permite invalidar
 *   de forma inmediata y coherente. Es la fuente de verdad mientras Redis responde.
 *
 * Si Redis falla, se degrada a L1 (comportamiento previo, por proceso) y al
 * recuperar la conexión rota la generación para descartar valores obsoletos.
 */
export class RedisPermissionsCache {
  private cache = new Map<string, CacheEntry>();
  private client: RedisClient | null = null;
  private connecting: Promise<RedisClient | null> | null = null;
  private retryAt = 0;
  private generation: string | null = null;
  private dirty = false;

  constructor(
    private readonly url: string,
    private readonly prefix: string
  ) {}

  private generationKey(): string {
    return `${this.prefix}generation`;
  }

  private valuePrefix(): string {
    return `${this.prefix}value:`;
  }

  private remember(userId: string, permissions: UserPermissions): void {
    this.cache.set(userId, { permissions, expiresAt: Date.now() + TTL_MS });
  }

  private ready(): RedisClient | null {
    return this.client?.status === 'ready' ? this.client : null;
  }

  private fail(client: RedisClient): void {
    client.disconnect();
    if (this.client === client) this.client = null;
    this.retryAt = Date.now() + RETRY_DELAY_MS;
    // Puede haber escrituras sin propagar; la próxima conexión rota la generación.
    this.dirty = true;
    logger.warn('[PermissionsCache] Redis no disponible; usando caché en memoria');
  }

  private async connection(): Promise<RedisClient | null> {
    if (this.connecting) return this.connecting;
    if (this.client?.status === 'ready') return this.client;
    if (Date.now() < this.retryAt) return null;

    this.connecting = (async () => {
      let client: RedisClient | null = null;
      try {
        const Redis = (await import('ioredis')).default;
        client = new Redis(this.url, {
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
        logger.info('[PermissionsCache] Redis no disponible; usando caché en memoria');
        return null;
      }
    })();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  // ─── L1: caché en memoria (síncrona) ─────────────────────────────

  get(userId: string): UserPermissions | null {
    const entry = this.cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(userId);
      return null;
    }
    return entry.permissions;
  }

  set(userId: string, permissions: UserPermissions): void {
    this.remember(userId, permissions);
    const client = this.ready();
    const generation = this.generation;
    if (!client || !generation) return;
    void client
      .eval(
        WRITE_SCRIPT,
        2,
        this.generationKey(),
        this.valuePrefix(),
        generation,
        userId,
        JSON.stringify(permissions),
        TTL_MS
      )
      .catch(() => this.fail(client));
  }

  async invalidate(userId: string): Promise<void> {
    // La entrada local se borra de inmediato, aunque Redis no responda.
    this.cache.delete(userId);
    const client = this.ready();
    if (!client) {
      // Sin Redis disponible: la próxima lectura con conexión rota la generación.
      this.dirty = true;
      return;
    }
    try {
      await client.eval(DELETE_SCRIPT, 2, this.generationKey(), this.valuePrefix(), userId);
    } catch {
      this.fail(client);
    }
  }

  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.generation = null;
    const client = this.ready();
    if (!client) {
      this.dirty = true;
      return;
    }
    // Nueva generación = todos los procesos descartan su L1 y releen de Redis.
    try {
      await client.set(this.generationKey(), randomUUID());
    } catch {
      this.fail(client);
    }
  }

  size(): number {
    return this.cache.size;
  }

  // ─── L2: caché compartida (Redis) ────────────────────────────────

  /**
   * Lee los permisos de Redis. Es la ruta normal de lectura; solo cae a L1 cuando
   * Redis no responde, para conservar el respaldo en memoria.
   */
  async read(userId: string): Promise<UserPermissions | null> {
    const client = await this.connection();
    if (!client) return this.get(userId);

    try {
      if (this.dirty) {
        // Hubo invalidaciones sin propagar durante una caída: rota la generación.
        await client.set(this.generationKey(), randomUUID());
        this.dirty = false;
        this.generation = null;
      }

      const result = (await client.eval(
        READ_SCRIPT,
        2,
        this.generationKey(),
        this.valuePrefix(),
        randomUUID(),
        userId
      )) as [string, string | null];

      const generation = result[0];
      if (generation !== this.generation) {
        this.generation = generation;
        this.cache.clear();
      }

      const value = result[1];
      if (!value) return null;

      const permissions = JSON.parse(value) as UserPermissions;
      this.remember(userId, permissions);
      return permissions;
    } catch {
      this.fail(client);
      return this.get(userId);
    }
  }

  close(): void {
    this.client?.disconnect();
    this.client = null;
  }
}

// Aísla entornos que comparten Redis sin exponer credenciales en las claves.
const database = [
  process.env.DB_HOST || '127.0.0.1',
  process.env.DB_PORT || '5432',
  process.env.DB_NAME || 'lasmunecasderamon'
].join(':');
const namespace = createHash('sha256').update(database).digest('hex').slice(0, 16);

export const PermissionsCache = new RedisPermissionsCache(
  process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  `lmr:perms:v1:${namespace}:`
);
