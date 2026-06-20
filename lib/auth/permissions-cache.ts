

import { UserPermissions } from '@/lib/middleware/auth';

const TTL_MS = 1 * 60 * 1000; 

interface CacheEntry {
  permissions: UserPermissions;
  expiresAt: number;
}


const cache = new Map<string, CacheEntry>();

export const PermissionsCache = {
  get(userId: string): UserPermissions | null {
    const entry = cache.get(userId);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(userId);
      return null;
    }
    return entry.permissions;
  },

  set(userId: string, permissions: UserPermissions): void {
    cache.set(userId, {
      permissions,
      expiresAt: Date.now() + TTL_MS
    });
  },

  
  invalidate(userId: string): void {
    cache.delete(userId);
  },

  
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  },

  
  clear(): void {
    cache.clear();
  },

  size(): number {
    return cache.size;
  }
};
