// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createRegistrationFetch } from '@/lib/api/registrationFetch';
import { REGISTRATION_HEADER } from '@/lib/api/registration-contract';
import { getPendingRegistrations } from '@/lib/store/registrationStore';
const origin = 'https://local.test';
const init = {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cantidad: 3 })
};
const response = () => Response.json({ success: true, data: { id: 'one' } }, { status: 201 });
const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    data
  };
};
afterEach(() => {
  expect(getPendingRegistrations()).toBe(0);
  vi.restoreAllMocks();
});
describe('proteccion compartida de registros', () => {
  it.each([
    '/api/purchases',
    '/api/sales',
    '/api/servicios',
    '/api/orders',
    '/api/cuentas',
    '/api/bar',
    '/api/anticipos',
    '/api/clients'
  ])('envia una sola solicitud ante dos envios simultaneos en %s', async path => {
    let release!: (response: Response) => void;
    const transport = vi.fn().mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          release = resolve;
        })
    );
    const guarded = createRegistrationFetch(transport, origin);
    const a = guarded(path, init);
    const b = guarded(path, init);
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    expect(getPendingRegistrations()).toBeGreaterThan(0);
    release(response());
    const responses = await Promise.all([a, b]);
    expect(await responses[0].json()).toEqual(await responses[1].json());
    expect(transport.mock.calls[0][0].headers.get(REGISTRATION_HEADER)).toBeTruthy();
  });
  it('una nueva compra confirmada recibe otra clave aunque tenga los mismos productos', async () => {
    const transport = vi.fn().mockImplementation(async () => response());
    const storage = memoryStorage();
    const guarded = createRegistrationFetch(transport, origin, storage);
    await guarded('/api/purchases', init);
    await guarded('/api/purchases', init);
    expect(transport).toHaveBeenCalledTimes(2);
    expect(transport.mock.calls[0][0].headers.get(REGISTRATION_HEADER)).not.toBe(
      transport.mock.calls[1][0].headers.get(REGISTRATION_HEADER)
    );
    expect(storage.data.size).toBe(0);
  });
  it('conserva la clave al perder la respuesta, incluso al reconstruir el cliente', async () => {
    const storage = memoryStorage();
    const transport = vi
      .fn()
      .mockRejectedValueOnce(new Error('respuesta perdida'))
      .mockImplementation(async () => response());
    await expect(
      createRegistrationFetch(transport, origin, storage)('/api/purchases', init)
    ).rejects.toThrow('perdida');
    const serialized = JSON.stringify([...storage.data]);
    expect(serialized).not.toContain('cantidad');
    await createRegistrationFetch(transport, origin, storage)('/api/purchases', init);
    expect(transport.mock.calls[0][0].headers.get(REGISTRATION_HEADER)).toBe(
      transport.mock.calls[1][0].headers.get(REGISTRATION_HEADER)
    );
  });
  it.each([409, 500])('conserva la clave cuando la respuesta es %s', async status => {
    const transport = vi
      .fn()
      .mockImplementation(async () => Response.json({ success: false }, { status }));
    const guarded = createRegistrationFetch(transport, origin);
    await guarded('/api/sales', init);
    await guarded('/api/sales', init);
    expect(transport.mock.calls[0][0].headers.get(REGISTRATION_HEADER)).toBe(
      transport.mock.calls[1][0].headers.get(REGISTRATION_HEADER)
    );
  });
  it('una correccion del formulario recibe otra clave tras un error de validacion', async () => {
    const transport = vi
      .fn()
      .mockImplementation(async () => Response.json({ success: false }, { status: 400 }));
    const guarded = createRegistrationFetch(transport, origin);
    await guarded('/api/sales', init);
    await guarded('/api/sales', { ...init, body: '{"cantidad":4}' });
    expect(transport.mock.calls[0][0].headers.get(REGISTRATION_HEADER)).not.toBe(
      transport.mock.calls[1][0].headers.get(REGISTRATION_HEADER)
    );
  });
  it('no mezcla dos intenciones explicitas de la cola offline', async () => {
    const transport = vi.fn().mockImplementation(async () => response());
    const guarded = createRegistrationFetch(transport, origin);
    await Promise.all(
      ['offline-key-one', 'offline-key-two'].map(key =>
        guarded('/api/orders', { ...init, headers: { ...init.headers, 'x-idempotency-key': key } })
      )
    );
    expect(transport).toHaveBeenCalledTimes(2);
    expect(
      transport.mock.calls.map(call => call[0].headers.get('x-idempotency-key')).sort()
    ).toEqual(['offline-key-one', 'offline-key-two']);
  });
  it('agrupa multipart iguales aunque tengan distinto boundary y conserva los archivos', async () => {
    let release!: (response: Response) => void;
    const transport = vi.fn().mockImplementation(
      () =>
        new Promise<Response>(resolve => {
          release = resolve;
        })
    );
    const guarded = createRegistrationFetch(transport, origin);
    const form = () => {
      const body = new FormData();
      body.set('nombre', 'Producto');
      body.set('foto', new File(['imagen'], 'a.png', { type: 'image/png' }));
      return body;
    };
    const a = guarded('/api/products', { method: 'POST', body: form() });
    const b = guarded('/api/products', { method: 'POST', body: form() });
    await vi.waitFor(() => expect(transport).toHaveBeenCalledTimes(1));
    release(response());
    await Promise.all([a, b]);
    const sent = await transport.mock.calls[0][0].formData();
    expect(sent.get('nombre')).toBe('Producto');
    expect((sent.get('foto') as File).name).toBe('a.png');
  });
  it('no altera GET, autenticacion ni solicitudes a otros servidores', async () => {
    const transport = vi.fn().mockImplementation(async () => response());
    const guarded = createRegistrationFetch(transport, origin);
    await guarded('/api/purchases');
    await guarded('/api/auth/login', init);
    await guarded('https://other.test/api/sales', init);
    expect(transport.mock.calls).toEqual([
      ['/api/purchases', undefined],
      ['/api/auth/login', init],
      ['https://other.test/api/sales', init]
    ]);
  });
});

it('descarta una clave de otra sesion sin reutilizar una respuesta ajena', async () => {
  const transport = vi
    .fn()
    .mockImplementationOnce(async () =>
      Response.json({ success: false, code: 'IDEMPOTENCY_OWNER_MISMATCH' }, { status: 409 })
    )
    .mockImplementation(async () => response());
  const guarded = createRegistrationFetch(transport, origin);
  await guarded('/api/purchases', init);
  await guarded('/api/purchases', init);
  expect(transport.mock.calls[0][0].headers.get(REGISTRATION_HEADER)).not.toBe(
    transport.mock.calls[1][0].headers.get(REGISTRATION_HEADER)
  );
});
