import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PermissionsCache } from '@/lib/auth/permissions-cache';
import type { UserPermissions } from '@/lib/middleware/auth';

const mockPerms: UserPermissions = {
  users: { read: true, write: false, delete: false },
  sales: { read: true, write: true, delete: false, anulate: false },
  products: { read: true, write: false, delete: false },
  clients: { read: true, write: false, delete: false },
  finances: { read: false, write: false, delete: false },
  reports: { read: false, export: false },
  settings: { read: false, write: false },
  orders: { read: true, write: false, delete: false, process: false },
  advances: { read: false, write: false, delete: false, process: false }
};

beforeEach(() => {
  PermissionsCache.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('PermissionsCache.get / set', () => {
  it('retorna null si no hay entrada', () => {
    expect(PermissionsCache.get('user-1')).toBeNull();
  });

  it('retorna los permisos después de set', () => {
    PermissionsCache.set('user-1', mockPerms);
    expect(PermissionsCache.get('user-1')).toEqual(mockPerms);
  });

  it('retorna null después de expirar el TTL', () => {
    vi.useFakeTimers();
    PermissionsCache.set('user-1', mockPerms);

    
    vi.advanceTimersByTime(60 * 1000 + 1);

    expect(PermissionsCache.get('user-1')).toBeNull();
  });

  it('retorna permisos si el TTL no ha expirado', () => {
    vi.useFakeTimers();
    PermissionsCache.set('user-1', mockPerms);

    vi.advanceTimersByTime(30 * 1000); 

    expect(PermissionsCache.get('user-1')).toEqual(mockPerms);
  });
});

describe('PermissionsCache.invalidate', () => {
  it('elimina la entrada del usuario', () => {
    PermissionsCache.set('user-1', mockPerms);
    PermissionsCache.invalidate('user-1');
    expect(PermissionsCache.get('user-1')).toBeNull();
  });

  it('no afecta a otros usuarios', () => {
    PermissionsCache.set('user-1', mockPerms);
    PermissionsCache.set('user-2', mockPerms);
    PermissionsCache.invalidate('user-1');
    expect(PermissionsCache.get('user-2')).toEqual(mockPerms);
  });
});

describe('PermissionsCache.purgeExpired', () => {
  it('elimina solo las entradas expiradas', () => {
    vi.useFakeTimers();

    PermissionsCache.set('user-1', mockPerms);
    vi.advanceTimersByTime(60 * 1000 + 1); 
    PermissionsCache.set('user-2', mockPerms); 

    PermissionsCache.purgeExpired();

    expect(PermissionsCache.get('user-1')).toBeNull();
    expect(PermissionsCache.get('user-2')).toEqual(mockPerms);
  });
});

describe('PermissionsCache.size', () => {
  it('refleja el número de entradas activas', () => {
    expect(PermissionsCache.size()).toBe(0);
    PermissionsCache.set('user-1', mockPerms);
    PermissionsCache.set('user-2', mockPerms);
    expect(PermissionsCache.size()).toBe(2);
    PermissionsCache.invalidate('user-1');
    expect(PermissionsCache.size()).toBe(1);
  });
});
