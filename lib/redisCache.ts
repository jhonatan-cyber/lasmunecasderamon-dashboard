import Redis from 'ioredis';
import { logger } from './logger';

const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  lazyConnect: true,
});

redisClient.on('error', err => {
  logger.error('Redis connection error', {
    error: err.message,
  });
});

redisClient.on('connect', () => {
  logger.info('Redis connected');
});

const DEFAULT_TTL = 300;

class RedisCache {
  private prefix: string;

  constructor(prefix = 'lmr:') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(this.getKey(key));
      return data ? (JSON.parse(data) as T) : null;
    } catch (error) {
      logger.error('Cache get error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
      return null;
    }
  }

  async set<T>(key: string, data: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      await redisClient.set(this.getKey(key), JSON.stringify(data), 'EX', ttl);
    } catch (error) {
      logger.error('Cache set error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  async del(key: string): Promise<void> {
    try {
      await redisClient.del(this.getKey(key));
    } catch (error) {
      logger.error('Cache delete error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  async delPattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error('Cache delete pattern error', {
        error: error instanceof Error ? error.message : String(error),
        pattern,
      });
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redisClient.exists(this.getKey(key));
      return result === 1;
    } catch {
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    try {
      await redisClient.expire(this.getKey(key), ttl);
    } catch (error) {
      logger.error('Cache expire error', {
        error: error instanceof Error ? error.message : String(error),
        key,
      });
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await redisClient.ttl(this.getKey(key));
    } catch {
      return -1;
    }
  }

  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number = DEFAULT_TTL
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    await this.set(key, data, ttl);
    return data;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redisClient.keys(this.getKey(pattern));
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
    } catch (error) {
      logger.error('Cache invalidate error', {
        error: error instanceof Error ? error.message : String(error),
        pattern,
      });
    }
  }

  async close(): Promise<void> {
    await redisClient.quit();
  }
}

export const cache = new RedisCache();

export const CacheKeys = {
  user: (id: number | string) => `user:${id}`,
  users: 'users:all',
  usersByRole: (role: string) => `users:role:${role}`,
  sales: (date: string) => `sales:${date}`,
  salesRange: (start: string, end: string) => `sales:${start}:${end}`,
  services: 'services:active',
  service: (id: number | string) => `service:${id}`,
  rooms: 'rooms:all',
  room: (id: number | string) => `room:${id}`,
  stats: 'stats:dashboard',
  statsDate: (date: string) => `stats:${date}`,
  commissions: (userId: number | string) => `commissions:${userId}`,
  tips: (userId: number | string) => `tips:${userId}`,
  notifications: (userId: number | string) => `notifications:${userId}`,
};

export const CacheTTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
  DAY: 86400,
};

export const cacheMiddleware = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
) => {
  return cache.getOrSet(key, fetcher, ttl);
};

export default cache;
