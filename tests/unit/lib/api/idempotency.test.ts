// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/server', () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) }
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

/** Repositorio de sincronización en memoria: la fila es el estado del test. */
const repo = vi.hoisted(() => ({
  filas: new Map<string, Record<string, unknown>>(),
  claim: vi.fn(),
  resolve: vi.fn(),
  fail: vi.fn()
}));

vi.mock('@/lib/repositories/SyncOperationRepository', () => ({
  SyncOperationRepository: {
    claim: repo.claim,
    resolve: repo.resolve,
    fail: repo.fail,
    // El parseo real es trivial y forma parte del contrato: se conserva.
    parseResponse: (operation: { respuesta: string | null }) => {
      if (!operation.respuesta) return null;
      try {
        const parsed = JSON.parse(operation.respuesta);
        return { status: Number(parsed?.status ?? 200), body: parsed?.body ?? {} };
      } catch {
        return null;
      }
    }
  }
}));

import {
  buildReplayResponse,
  IDEMPOTENCY_HEADER,
  isValidIdempotencyKey,
  readIdempotencyKey,
  runIdempotent
} from '@/lib/api/idempotency';

const CLAVE = 'abc12345-clave-de-prueba';

const buildRequest = (key?: string) =>
  new Request('http://localhost/api/orders', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(key ? { [IDEMPOTENCY_HEADER]: key } : {})
    },
    body: JSON.stringify({ codigo: 'ABC12345' })
  });

const filaAplicada = (body: unknown, status = 201) => ({
  id_cliente: CLAVE,
  usuario_id: null,
  endpoint: 'orders.create',
  estado: 'aplicada' as const,
  respuesta: JSON.stringify({ status, body }),
  intentos: 1,
  creado_en: '2026-09-28 10:00:00',
  aplicado_en: '2026-09-28 10:00:01'
});

describe('claves de idempotencia', () => {
  it('debe aceptar claves opacas entre 8 y 64 caracteres', () => {
    expect(isValidIdempotencyKey('abc12345')).toBe(true);
    expect(isValidIdempotencyKey('mm3k1-abc_123.def:ghi')).toBe(true);
    expect(isValidIdempotencyKey('a'.repeat(64))).toBe(true);
  });

  it('debe rechazar claves vacías, cortas, largas o con espacios', () => {
    expect(isValidIdempotencyKey('')).toBe(false);
    expect(isValidIdempotencyKey('abc1234')).toBe(false);
    expect(isValidIdempotencyKey('a'.repeat(65))).toBe(false);
    expect(isValidIdempotencyKey('abc 12345')).toBe(false);
    expect(isValidIdempotencyKey("abc'12345")).toBe(false);
  });

  it('debe leer la clave del header y aceptar el alias sin prefijo x-', () => {
    expect(readIdempotencyKey(buildRequest(CLAVE))).toBe(CLAVE);

    const alias = new Request('http://localhost/api/orders', {
      method: 'POST',
      headers: { 'idempotency-key': 'otra-clave-valida' }
    });
    expect(readIdempotencyKey(alias)).toBe('otra-clave-valida');
  });

  it('debe devolver null sin header, con header vacío o con clave inválida', () => {
    expect(readIdempotencyKey(buildRequest())).toBeNull();
    expect(readIdempotencyKey(buildRequest('   '))).toBeNull();
    expect(readIdempotencyKey(buildRequest('corta'))).toBeNull();
  });
});

describe('runIdempotent', () => {
  beforeEach(() => {
    repo.claim.mockReset();
    repo.resolve.mockReset();
    repo.fail.mockReset();
    repo.resolve.mockResolvedValue(undefined);
    repo.fail.mockResolvedValue(undefined);
  });

  it('debe ejecutar el handler sin reclamar nada cuando no hay clave', async () => {
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 201 }));

    const response = await runIdempotent(buildRequest(), { endpoint: 'orders.create' }, handler);

    expect(response.status).toBe(201);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(repo.claim).not.toHaveBeenCalled();
    expect(repo.resolve).not.toHaveBeenCalled();
  });

  it('debe ejecutar y guardar la respuesta la primera vez', async () => {
    repo.claim.mockResolvedValue({ claimed: true, operation: null });
    const handler = vi
      .fn()
      .mockResolvedValue(Response.json({ success: true, data: { id: 'p-1' } }, { status: 201 }));

    const response = await runIdempotent(
      buildRequest(CLAVE),
      { endpoint: 'orders.create', usuarioId: 'u-1' },
      handler
    );

    expect(response.status).toBe(201);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(repo.claim).toHaveBeenCalledWith(CLAVE, {
      endpoint: 'orders.create',
      usuarioId: 'u-1',
      deviceDate: undefined
    });
    expect(repo.resolve).toHaveBeenCalledWith(CLAVE, 'aplicada', {
      status: 201,
      body: { success: true, data: { id: 'p-1' } }
    });
    // La respuesta original no se consume al auditar el intento.
    await expect(response.json()).resolves.toEqual({ success: true, data: { id: 'p-1' } });
  });

  it('debe marcar rechazada cuando el handler responde 4xx', async () => {
    repo.claim.mockResolvedValue({ claimed: true, operation: null });
    const handler = vi
      .fn()
      .mockResolvedValue(Response.json({ success: false, message: 'inválido' }, { status: 400 }));

    await runIdempotent(buildRequest(CLAVE), { endpoint: 'orders.create' }, handler);

    expect(repo.resolve).toHaveBeenCalledWith(CLAVE, 'rechazada', {
      status: 400,
      body: { success: false, message: 'inválido' }
    });
  });

  it('debe marcar fallida cuando el handler responde 5xx', async () => {
    repo.claim.mockResolvedValue({ claimed: true, operation: null });
    const handler = vi.fn().mockResolvedValue(Response.json({ success: false }, { status: 503 }));

    await runIdempotent(buildRequest(CLAVE), { endpoint: 'orders.create' }, handler);

    expect(repo.resolve).toHaveBeenCalledWith(CLAVE, 'fallida', {
      status: 503,
      body: { success: false }
    });
  });

  it('debe marcar fallida y propagar el error cuando el handler lanza', async () => {
    repo.claim.mockResolvedValue({ claimed: true, operation: null });
    const handler = vi.fn().mockRejectedValue(new Error('se cayó la transacción'));

    await expect(
      runIdempotent(buildRequest(CLAVE), { endpoint: 'orders.create' }, handler)
    ).rejects.toThrow('se cayó la transacción');

    expect(repo.fail).toHaveBeenCalledWith(CLAVE, 'se cayó la transacción');
    expect(repo.resolve).not.toHaveBeenCalled();
  });

  it('no debe volver a ejecutar cuando la clave ya se aplicó: replica la respuesta', async () => {
    repo.claim.mockResolvedValue({
      claimed: false,
      operation: filaAplicada({ success: true, data: { id: 'p-1' } })
    });
    const handler = vi.fn();

    const response = await runIdempotent(
      buildRequest(CLAVE),
      { endpoint: 'orders.create' },
      handler
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(201);
    expect(response.headers.get('x-idempotent-replay')).toBe('1');
    await expect(response.json()).resolves.toEqual({ success: true, data: { id: 'p-1' } });
  });

  it('debe replicar también un rechazo determinista', async () => {
    repo.claim.mockResolvedValue({
      claimed: false,
      operation: {
        ...filaAplicada({ success: false, message: 'Código es requerido' }, 422),
        estado: 'rechazada'
      }
    });
    const handler = vi.fn();

    const response = await runIdempotent(
      buildRequest(CLAVE),
      { endpoint: 'orders.create' },
      handler
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      success: false,
      message: 'Código es requerido'
    });
  });

  it('debe responder 409 sin re-ejecutar si la operación quedó pendiente', async () => {
    repo.claim.mockResolvedValue({
      claimed: false,
      operation: { ...filaAplicada({}), estado: 'pendiente', respuesta: null }
    });
    const handler = vi.fn();

    const response = await runIdempotent(
      buildRequest(CLAVE),
      { endpoint: 'orders.create' },
      handler
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'IDEMPOTENCY_PENDIENTE' });
  });

  it('debe responder 409 sin re-ejecutar si la operación quedó fallida', async () => {
    repo.claim.mockResolvedValue({
      claimed: false,
      operation: { ...filaAplicada({}), estado: 'fallida', respuesta: '{no-es-json' }
    });
    const handler = vi.fn();

    const response = await runIdempotent(
      buildRequest(CLAVE),
      { endpoint: 'orders.create' },
      handler
    );

    expect(handler).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ code: 'IDEMPOTENCY_FALLIDA' });
  });

  it('debe ejecutar igual si el claim dice que no se reclamó pero no hay fila', async () => {
    repo.claim.mockResolvedValue({ claimed: false, operation: null });
    const handler = vi.fn().mockResolvedValue(Response.json({ ok: true }, { status: 201 }));

    const response = await runIdempotent(
      buildRequest(CLAVE),
      { endpoint: 'orders.create' },
      handler
    );

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(201);
  });
});

describe('buildReplayResponse', () => {
  it('debe devolver el status guardado y el eco de la clave', () => {
    const response = buildReplayResponse(filaAplicada({ ok: true }, 201));

    expect(response.status).toBe(201);
    expect(response.headers.get(IDEMPOTENCY_HEADER)).toBe(CLAVE);
    expect(response.headers.get('x-idempotent-replay')).toBe('1');
  });

  it('debe degradar a 409 si la respuesta guardada no se puede leer', () => {
    const response = buildReplayResponse({ ...filaAplicada({}), respuesta: 'roto' });

    expect(response.status).toBe(409);
  });
});
