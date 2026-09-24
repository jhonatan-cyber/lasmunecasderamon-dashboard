import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { logger } from '@/lib/utils/logger';

// A generation separates values computed before and after a committed write.
// Lua ensures that a slow query cannot repopulate the new generation.
const READ = `
local generation = redis.call('GET', KEYS[1])
if not generation then
  generation = ARGV[1]
  redis.call('SET', KEYS[1], generation)
end
local value = redis.call('GET', KEYS[2] .. generation .. ':' .. ARGV[2])
return {generation, value}
`;
const WRITE = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[2] .. ARGV[1] .. ':' .. ARGV[2], ARGV[3], 'PX', ARGV[4])
return 1
`;

export class RedisDashboardCache {
  private client: Redis | null = null;
  private connecting: Promise<Redis | null> | null = null;
  private retryAt = 0;
  private dirty = false;

  constructor(
    private readonly url: string,
    private readonly prefix: string
  ) {}

  private fail(client: Redis): void {
    client.disconnect();
    if (this.client === client) this.client = null;
    this.retryAt = Date.now() + 5000;
    // A write may have occurred while unavailable. Rotate on recovery.
    this.dirty = true;
    logger.warn('[DashboardCache] Redis no disponible; consultas directas hasta reconectar');
  }

  private async connection(): Promise<Redis | null> {
    if (this.connecting) return this.connecting;
    if (this.client?.status === 'ready') return this.client;
    if (Date.now() < this.retryAt) return null;
    this.connecting = (async () => {
      const client = new Redis(this.url, {
        lazyConnect: true,
        connectTimeout: 500,
        commandTimeout: 500,
        enableOfflineQueue: false,
        retryStrategy: () => null,
        maxRetriesPerRequest: 0,
        autoResendUnfulfilledCommands: false
      });
      client.on('error', () => {});
      this.client = client;
      try {
        await client.connect();
        if (this.dirty) {
          await client.set(`${this.prefix}generation`, randomUUID());
          this.dirty = false;
        }
        return client;
      } catch {
        this.fail(client);
        return null;
      }
    })();
    try {
      return await this.connecting;
    } finally {
      this.connecting = null;
    }
  }

  async getOrFetch<T>(
    key: string,
    fetch: () => Promise<T>,
    ttlMs = 15000
  ): Promise<{
    data: T;
    fromCache: boolean;
  }> {
    const client = await this.connection();
    let generation: string | undefined;
    if (client) {
      try {
        const result = (await client.eval(
          READ,
          2,
          `${this.prefix}generation`,
          `${this.prefix}value:`,
          randomUUID(),
          key
        )) as [string, string | null];
        generation = result[0];
        if (result[1] !== null) return { data: JSON.parse(result[1]) as T, fromCache: true };
      } catch {
        this.fail(client);
      }
    }

    // Never retain a local fallback: workers could miss invalidations during an outage.
    const data = await fetch();
    if (client?.status === 'ready' && generation && ttlMs > 0) {
      try {
        await client.eval(
          WRITE,
          2,
          `${this.prefix}generation`,
          `${this.prefix}value:`,
          generation,
          key,
          JSON.stringify(data),
          Math.min(ttlMs, 30000)
        );
      } catch {
        this.fail(client);
      }
    }
    return { data, fromCache: false };
  }

  async invalidate(): Promise<void> {
    this.dirty = true;
    const client = await this.connection();
    if (!client) return;
    try {
      await client.set(`${this.prefix}generation`, randomUUID());
      this.dirty = false;
    } catch {
      this.fail(client);
    }
  }

  close(): void {
    this.client?.disconnect();
    this.client = null;
  }
}
