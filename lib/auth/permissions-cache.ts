/**
 * Caché en memoria para permisos de usuario.
 *
 * Por qué dos capas:
 * - React cache()  → deduplica llamadas dentro del MISMO request (sin costo)
 * - PermissionsCache → evita queries entre requests distintos del mismo usuario
 *
 * TTL de 5 minutos: balance entre frescura y performance.
 * Si un admin cambia permisos, el efecto se ve en máximo 5 min.
 * Para invalidación inmediata se puede llamar a invalidate(userId).
 */

import { UserPermissions } from '@/lib/middleware/auth';

const TTL_MS = 5 * 60 * 1000; // 5 minutos

interface CacheEntry {
  permissions: UserPermissions;
  expiresAt: number;
}

// Map global al proceso Node.js — persiste entre requests
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

  /** Invalida el caché de un usuario específico (ej: al cambiar su rol) */
  invalidate(userId: string): void {
    cache.delete(userId);
  },

  /** Limpia entradas expiradas — llamar periódicamente si el proceso es long-lived */
  purgeExpired(): void {
    const now = Date.now();
    for (const [key, entry] of cache.entries()) {
      if (now > entry.expiresAt) cache.delete(key);
    }
  },

  /** Para tests */
  clear(): void {
    cache.clear();
  },

  size(): number {
    return cache.size;
  }
};
