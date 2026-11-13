// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  entregar: vi.fn(),
  crear: vi.fn(),
  obtener: vi.fn(),
  listar: vi.fn(),
  venta: vi.fn(),
  notificar: vi.fn()
}));
vi.mock('@/lib/api/withRoute', () => ({
  withRoute:
    (_config: unknown, handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request, context: { params?: unknown } = {}) =>
      handler(request, {
        params: context.params ?? Promise.resolve({ id: 's1' }),
        user: { id: 'cajero', name: 'Caja', lastName: 'Prueba' }
      })
}));
vi.mock('@/modules/entradas', () => ({
  entregarGrupoEntradas: mocks.entregar,
  crearSolicitudCover: mocks.crear,
  obtenerSolicitudCover: mocks.obtener,
  listarSolicitudesCover: mocks.listar
}));
vi.mock('@/workflows/ventas', () => ({ SaleService: { createSale: mocks.venta } }));
vi.mock('@/lib/notifications/entradaNotificationUtils', () => ({
  notificarEntradaActualizada: mocks.notificar
}));

import { POST } from '@/app/api/tickets/entregar-grupo/route';
import { POST as solicitar } from '@/app/api/tickets/cover-solicitudes/route';
import { PATCH as aprobar } from '@/app/api/tickets/cover-solicitudes/[id]/approve/route';

const payload = {
  entrada_ids: ['e1', 'e2'],
  monto_adicional: 10000,
  unidades: [{ presentacion_id: 'p1', tipo_entrega: 'botella' }]
};
const request = (body: unknown) =>
  new Request('http://localhost/api/tickets/entregar-grupo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
const resultado = {
  entradas: 2,
  productos: 1,
  montoEntrada: 20000,
  montoCobrarBarra: 10000,
  presupuesto: 30000
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.entregar.mockResolvedValue(resultado);
  mocks.crear.mockResolvedValue('s1');
  mocks.obtener.mockResolvedValue({
    id: 's1',
    estado: 'pendiente',
    entrada_ids: payload.entrada_ids,
    unidades: payload.unidades,
    monto_total: '10000',
    cliente_nombre: 'Grupo'
  });
});

describe('contratos HTTP de entrega de covers', () => {
  it('entrega todo el lote con una sola operación y notifica después', async () => {
    const response = await POST(request(payload), { params: Promise.resolve({}) });
    expect(await response.json()).toEqual({ success: true, data: resultado });
    expect(mocks.entregar).toHaveBeenCalledTimes(1);
    expect(mocks.entregar.mock.calls[0][0]).toEqual({
      entradaIds: ['e1', 'e2'],
      montoAdicional: 10000,
      unidades: payload.unidades,
      usuarioId: 'cajero'
    });
    expect(mocks.notificar).toHaveBeenCalledTimes(2);
    expect(mocks.notificar.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.entregar.mock.invocationCallOrder[0]
    );
  });

  it('no notifica nada cuando el lote falla', async () => {
    mocks.entregar.mockRejectedValue(new Error('Sin stock'));
    await expect(POST(request(payload), { params: Promise.resolve({}) })).rejects.toThrow(
      'Sin stock'
    );
    expect(mocks.notificar).not.toHaveBeenCalled();
  });

  it('transmite el contexto y los efectos postcommit al registrador de ventas', async () => {
    mocks.venta.mockResolvedValue({ id: 'v1' });
    await POST(request(payload), { params: Promise.resolve({}) });
    const registrar = mocks.entregar.mock.calls[0][1];
    const efecto = vi.fn();
    const venta = await registrar(
      {
        totalVenta: 30000,
        metodoPago: 'efectivo',
        entradaId: 'e1',
        usuarioId: 'cajero',
        detalles: []
      },
      { id: 'unidad' },
      efecto
    );
    expect(venta).toEqual({ ventaId: 'v1' });
    expect(mocks.venta.mock.calls[0][2]).toEqual({
      contexto: { id: 'unidad' },
      entradaId: 'e1',
      onAfterCommit: efecto
    });
  });

  it('permite solicitudes con más bebidas que entradas y guarda todo el aporte', async () => {
    await solicitar(
      request({
        ...payload,
        entrada_ids: ['e1'],
        unidades: [...payload.unidades, ...payload.unidades],
        monto_total: 999999
      }),
      { params: Promise.resolve({}) }
    );
    expect(mocks.crear).toHaveBeenCalledWith(
      {
        grupoRegistroId: null,
        clienteNombre: null,
        entradaIds: ['e1'],
        unidades: [...payload.unidades, ...payload.unidades],
        montoTotal: 10000
      },
      'cajero'
    );
  });

  it('aprueba el lote con el id de solicitud para bloquearlo en la transacción', async () => {
    await aprobar(request({}), { params: Promise.resolve({ id: 's1' }) });
    expect(mocks.entregar).toHaveBeenCalledWith(
      {
        entradaIds: ['e1', 'e2'],
        montoAdicional: 10000,
        unidades: payload.unidades,
        usuarioId: 'cajero',
        solicitudId: 's1'
      },
      expect.any(Function)
    );
    expect(mocks.entregar).toHaveBeenCalledTimes(1);
  });
});
