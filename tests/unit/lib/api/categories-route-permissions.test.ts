// @vitest-environment node
import fs from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROJECT_ROOT } from './_walk-helpers';

/**
 * Guardas de las rutas de categorías.
 *
 * Las mutaciones de categorías se protegían con `products.write` / `products.delete`,
 * mientras la UI las gatea con los pares del catálogo del módulo `categories`
 * (`categories.edit`, `categories.activate`, …). Resultado: un rol con
 * `categories.edit` veía el botón «Editar» y la API le respondía 403 (y al revés, un
 * permiso de productos habilitaba tocar categorías por API).
 *
 * Estos tests fijan el vocabulario correcto por comportamiento: con la matriz del
 * módulo se pasa, con la de productos se rechaza, y el flag de borrado sigue siendo
 * distinto del de escritura.
 */

vi.hoisted(() => {
  process.env.JWT_SECRET = 'test-secret-that-is-long-enough-for-validation';
});

const db = vi.hoisted(() => ({ query: vi.fn() }));
const permissionsCache = vi.hoisted(() => ({ invalidate: vi.fn(), clear: vi.fn() }));
const auth = vi.hoisted(() => ({ user: null as any }));

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
}));

vi.mock('@/lib/api/date-response', () => ({ normalizeJsonResponseDates: (r: any) => r }));

vi.mock('@/lib/auth/auth-app', () => ({
  getAuth: vi.fn().mockImplementation(async () => auth.user)
}));

vi.mock('@/lib/services/CategoryService', () => ({
  CategoryService: {
    getAll: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'cat-1', name: 'Nueva' }),
    update: vi.fn().mockResolvedValue({ id: 'cat-1' }),
    updateStatus: vi.fn().mockResolvedValue({ id: 'cat-1', estado: 0 }),
    delete: vi.fn().mockResolvedValue(undefined),
    reorder: vi.fn().mockResolvedValue(undefined)
  }
}));

vi.mock('@/lib/services/AuditService', () => ({
  AuditService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/services/ErrorLogService', () => ({
  ErrorLogService: { log: vi.fn().mockResolvedValue(undefined) }
}));

vi.mock('@/lib/utils/logger', () => {
  const mocks = {
    error: vi.fn(),
    captureException: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  };
  return { logger: mocks, default: mocks };
});

vi.mock('@/lib/database/db', () => ({ query: db.query }));
vi.mock('@/lib/auth/permissions-cache', () => ({ PermissionsCache: permissionsCache }));

import { CategoryService } from '@/lib/services/CategoryService';
import { DELETE, PATCH, POST, PUT } from '@/app/api/categories/route';
import {
  DELETE as DELETE_BY_ID,
  PATCH as PATCH_BY_ID,
  PUT as PUT_BY_ID
} from '@/app/api/categories/[id]/route';
import { PUT as PUT_REORDER } from '@/app/api/categories/reorder/route';

const service = vi.mocked(CategoryService, true);

/** Sesión con exactamente los flags indicados: lo que no figura, queda denegado. */
const sessionWith = (permissions: Record<string, Record<string, boolean>>, role = 'Cajero') => ({
  id: 'user-1',
  username: 'prueba',
  name: 'Prueba',
  lastName: 'Pérez',
  email: 'prueba@ejemplo.com',
  role,
  permissions,
  iat: 0,
  exp: 0
});

const CATEGORIES_ONLY = { categories: { read: true, write: true, delete: true } };
const PRODUCTS_ONLY = { products: { read: true, write: true, delete: true } };

const call = (handler: any, url: string, init?: RequestInit) =>
  handler(new Request(url, init), { params: Promise.resolve({ id: 'cat-1' }) });

const json = (method: string) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'Categoría de prueba', description: 'd' })
});

const post = (handler: any = POST) =>
  call(handler, 'http://localhost/api/categories', json('POST'));
const put = (url: string) => call(PUT, url, json('PUT'));

beforeEach(() => {
  vi.clearAllMocks();
  db.query.mockResolvedValue([]);
  auth.user = sessionWith(CATEGORIES_ONLY);
});

describe('rutas de categorías · las mutaciones exigen el módulo categories', () => {
  it('POST con categories.write crea la categoría', async () => {
    const res = await post();

    expect(res.status).toBe(201);
    expect(service.create).toHaveBeenCalledWith('Categoría de prueba', 'd');
  });

  it('POST con sólo products.write se rechaza y no toca la base', async () => {
    auth.user = sessionWith(PRODUCTS_ONLY);

    const res = await post();

    expect(res.status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('POST sin sesión no llega al servicio', async () => {
    auth.user = null;

    const res = await post();

    expect(res.status).toBe(401);
    expect(service.create).not.toHaveBeenCalled();
  });

  it('PUT ?id= con categories.write actualiza la categoría', async () => {
    const res = await put('http://localhost/api/categories?id=cat-1');

    expect(res.status).toBe(200);
    expect(service.update).toHaveBeenCalledWith('cat-1', 'Categoría de prueba', 'd');
  });

  it('PUT ?id= con sólo products.write se rechaza', async () => {
    auth.user = sessionWith(PRODUCTS_ONLY);

    const res = await put('http://localhost/api/categories?id=cat-1');

    expect(res.status).toBe(403);
    expect(service.update).not.toHaveBeenCalled();
  });

  it('PATCH ?id=&action=deactivate con categories.write cambia el estado', async () => {
    const res = await call(PATCH, 'http://localhost/api/categories?id=cat-1&action=deactivate', {
      method: 'PATCH'
    });

    expect(res.status).toBe(200);
    expect(service.updateStatus).toHaveBeenCalledWith('cat-1', 'deactivate');
  });

  it('PATCH con sólo products.write se rechaza', async () => {
    auth.user = sessionWith(PRODUCTS_ONLY);

    const res = await call(PATCH, 'http://localhost/api/categories?id=cat-1&action=deactivate', {
      method: 'PATCH'
    });

    expect(res.status).toBe(403);
    expect(service.updateStatus).not.toHaveBeenCalled();
  });

  it('reorder con categories.write reordena', async () => {
    const res = await call(PUT_REORDER, 'http://localhost/api/categories/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: 'cat-1', orden: 1 }])
    });

    expect(res.status).toBe(200);
    expect(service.reorder).toHaveBeenCalledWith([{ id: 'cat-1', orden: 1 }]);
  });

  it('reorder con sólo products.write se rechaza', async () => {
    auth.user = sessionWith(PRODUCTS_ONLY);

    const res = await call(PUT_REORDER, 'http://localhost/api/categories/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ id: 'cat-1', orden: 1 }])
    });

    expect(res.status).toBe(403);
    expect(service.reorder).not.toHaveBeenCalled();
  });

  it('[id] PUT y PATCH usan categories.write', async () => {
    const putRes = await call(PUT_BY_ID, 'http://localhost/api/categories/cat-1', json('PUT'));
    const patchRes = await call(
      PATCH_BY_ID,
      'http://localhost/api/categories/cat-1?action=activate',
      { method: 'PATCH' }
    );

    expect(putRes.status).toBe(200);
    expect(patchRes.status).toBe(200);
    expect(service.update).toHaveBeenCalled();
    expect(service.updateStatus).toHaveBeenCalledWith('cat-1', 'activate');
  });

  it('[id] PUT con sólo products.write se rechaza', async () => {
    auth.user = sessionWith(PRODUCTS_ONLY);

    const res = await call(PUT_BY_ID, 'http://localhost/api/categories/cat-1', json('PUT'));

    expect(res.status).toBe(403);
    expect(service.update).not.toHaveBeenCalled();
  });
});

describe('rutas de categorías · borrar es un permiso aparte', () => {
  it('DELETE ?id= con categories.delete borra', async () => {
    auth.user = sessionWith({ categories: { read: true, write: true, delete: true } });

    const res = await call(DELETE, 'http://localhost/api/categories?id=cat-1', {
      method: 'DELETE'
    });

    expect(res.status).toBe(200);
    expect(service.delete).toHaveBeenCalledWith('cat-1');
  });

  it('DELETE ?id= con categories.write pero sin delete se rechaza', async () => {
    auth.user = sessionWith({ categories: { read: true, write: true, delete: false } });

    const res = await call(DELETE, 'http://localhost/api/categories?id=cat-1', {
      method: 'DELETE'
    });

    expect(res.status).toBe(403);
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('DELETE ?id= con products.delete se rechaza: el borrado no viene de productos', async () => {
    auth.user = sessionWith({ products: { read: true, write: true, delete: true } });

    const res = await call(DELETE, 'http://localhost/api/categories?id=cat-1', {
      method: 'DELETE'
    });

    expect(res.status).toBe(403);
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('[id] DELETE exige categories.delete', async () => {
    auth.user = sessionWith({ categories: { read: true, write: true, delete: true } });
    const ok = await call(DELETE_BY_ID, 'http://localhost/api/categories/cat-1', {
      method: 'DELETE'
    });

    auth.user = sessionWith({ categories: { read: true, write: true, delete: false } });
    const denied = await call(DELETE_BY_ID, 'http://localhost/api/categories/cat-1', {
      method: 'DELETE'
    });

    expect(ok.status).toBe(200);
    expect(denied.status).toBe(403);
    expect(service.delete).toHaveBeenCalledTimes(1);
  });

  it('el administrador pasa sin filas de categorías', async () => {
    auth.user = sessionWith({}, 'administrador');

    const res = await post();

    expect(res.status).toBe(201);
  });
});

describe('rutas de categorías · guard estático', () => {
  it('ninguna declaración de guard bajo app/api/categories usa el módulo products', () => {
    const root = path.join(PROJECT_ROOT, 'app', 'api', 'categories');
    const offenders: string[] = [];

    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full);
          continue;
        }
        if (!entry.name.endsWith('.ts')) continue;
        const source = fs.readFileSync(full, 'utf8');
        for (const match of source.matchAll(/module:\s*'([^']+)'/g)) {
          if (match[1] !== 'categories') {
            offenders.push(`${path.relative(PROJECT_ROOT, full)} → module: '${match[1]}'`);
          }
        }
      }
    };
    walk(root);

    expect(
      offenders,
      `\nRutas de categorías con un guard de otro módulo:\n${offenders.map(o => `  ${o}`).join('\n')}\n`
    ).toEqual([]);
  });
});
