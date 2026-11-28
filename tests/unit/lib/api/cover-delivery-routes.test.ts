// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  entregar: vi.fn(),
  crear: vi.fn(),
  obtener: vi.fn(),
  listar: vi.fn(),
  rechazar: vi.fn(),
  venta: vi.fn(),
  notificar: vi.fn()
}));
vi.mock('@/lib/api/withRoute', () => ({
  withRoute:
    (_config: unknown, handler: (request: Request, context: unknown) => Promise<Response>) =>
    (request: Request, context: { params?: unknown; user?: unknown } = {}) =>
      handler(request, {
        params: context.params ?? Promise.resolve({ id: 's1' }),
        user: context.user ?? { id: 'b1', name: 'Bar', lastName: 'Man', role: 'Barman' }
      })
}));
vi.mock('@/modules/entradas', () => ({
  entregarGrupoEntradas: mocks.entregar,
  crearSolicitudCover: mocks.crear,
  obtenerSolicitudCover: mocks.obtener,
  listarSolicitudesCover: mocks.listar,
  rechazarSolicitudCover: mocks.rechazar
}));
vi.mock('@/workflows/ventas', () => ({ SaleService: { createSale: mocks.venta } }));
vi.mock('@/lib/notifications/entradaNotificationUtils', () => ({
  notificarEntradaActualizada: mocks.notificar
}));

import { POST } from '@/app/api/tickets/entregar-grupo/route';
import { POST as solicitar } from '@/app/api/tickets/cover-solicitudes/route';
import { PATCH as aprobar } from '@/app/api/tickets/cover-solicitudes/[id]/approve/route';
import { PATCH as rechazar } from '@/app/api/tickets/cover-solicitudes/[id]/reject/route';

const barman = { id: 'b1', name: 'Bar', lastName: 'Man', role: 'Barman' };
const cajero = { id: 'cajero', name: 'Caja', lastName: 'Prueba', role: 'Cajero' };
const garzon = { id: 'g1', name: 'Gar', lastName: 'Zon', role: 'Garzon' };
const administrador = { id: 'a1', name: 'Admin', lastName: 'Istrador', role: 'Administrador' };

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
      usuarioId: 'b1'
    });
    expect(mocks.notificar).toHaveBeenCalledTimes(2);
    expect(mocks.notificar.mock.invocationCallOrder[0]).toBeGreaterThan(
      mocks.entregar.mock.invocationCallOrder[0]
    );
  });

  it('recibe configuraciones individuales y pasa anfitriona y habitación a cada venta', async () => {
    const individual = {
      entregas: [
        {
          entrada_id: 'e1',
          monto_adicional: 1000,
          anfitriona_id: 'host-1',
          habitacion_id: 'room-1',
          unidades: [{ presentacion_id: 'p1', tipo_entrega: 'botella' }]
        },
        {
          entrada_id: 'e2',
          monto_adicional: 0,
          anfitriona_id: null,
          habitacion_id: null,
          unidades: [{ presentacion_id: 'p2', tipo_entrega: 'corte' }]
        }
      ]
    };
    await POST(request(individual), { params: Promise.resolve({}) });

    expect(mocks.entregar.mock.calls[0]?.[0]).toEqual({
      entradaIds: ['e1', 'e2'],
      unidades: [],
      montoAdicional: 0,
      usuarioId: 'b1',
      entregas: [
        {
          entradaId: 'e1',
          unidades: individual.entregas[0].unidades,
          montoAdicional: 1000,
          anfitrionaId: 'host-1',
          habitacionId: 'room-1'
        },
        {
          entradaId: 'e2',
          unidades: individual.entregas[1].unidades,
          montoAdicional: 0,
          anfitrionaId: null,
          habitacionId: null
        }
      ]
    });
    expect(mocks.notificar).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ entradaId: 'e1', montoCobrarBarra: 1000 })
    );
    expect(mocks.notificar).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ entradaId: 'e2', montoCobrarBarra: 0 })
    );

    const registrar = mocks.entregar.mock.calls[0]?.[1];
    await registrar?.(
      {
        totalVenta: 11000,
        metodoPago: 'efectivo',
        entradaId: 'e1',
        usuarioId: 'b1',
        detalles: [],
        anfitrionas: ['host-1'],
        habitacionId: 'room-1'
      },
      { id: 'unidad' },
      vi.fn()
    );
    expect(mocks.venta.mock.calls[0]?.[0]).toMatchObject({
      usuarios: ['host-1'],
      habitacion_id: 'room-1'
    });
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
        usuarioId: 'b1',
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
      'b1'
    );
  });

  it('aprueba el lote con el id de solicitud para bloquearlo en la transacción', async () => {
    await aprobar(request({}), {
      params: Promise.resolve({ id: 's1' }),
      user: cajero
    } as unknown as { params: Promise<{ id: string }> });
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

  it('no deja que el barman apruebe la solicitud que él envió', async () => {
    const respuesta = await aprobar(request({}), {
      params: Promise.resolve({ id: 's1' }),
      user: barman
    } as unknown as { params: Promise<{ id: string }> });
    expect(respuesta.status).toBe(403);
    expect(mocks.entregar).not.toHaveBeenCalled();
    expect(mocks.notificar).not.toHaveBeenCalled();
  });

  it('no deja que el barman rechace la solicitud que él envió', async () => {
    const respuesta = await rechazar(request({ motivo: 'Stock insuficiente' }), {
      params: Promise.resolve({ id: 's1' }),
      user: barman
    } as unknown as { params: Promise<{ id: string }> });
    expect(respuesta.status).toBe(403);
    expect(mocks.rechazar).not.toHaveBeenCalled();
  });

  it('no deja que el garzón apruebe covers', async () => {
    const respuesta = await aprobar(request({}), {
      params: Promise.resolve({ id: 's1' }),
      user: garzon
    } as unknown as { params: Promise<{ id: string }> });
    expect(respuesta.status).toBe(403);
    expect(mocks.entregar).not.toHaveBeenCalled();
    expect(mocks.notificar).not.toHaveBeenCalled();
  });

  it('no deja que el garzón rechace covers', async () => {
    const respuesta = await rechazar(request({ motivo: 'Stock insuficiente' }), {
      params: Promise.resolve({ id: 's1' }),
      user: garzon
    } as unknown as { params: Promise<{ id: string }> });
    expect(respuesta.status).toBe(403);
    expect(mocks.rechazar).not.toHaveBeenCalled();
  });

  it('la administración sí puede aprobar la solicitud', async () => {
    const respuesta = await aprobar(request({}), {
      params: Promise.resolve({ id: 's1' }),
      user: administrador
    } as unknown as { params: Promise<{ id: string }> });
    expect(respuesta.status).toBe(200);
    expect(mocks.entregar).toHaveBeenCalledWith(
      expect.objectContaining({ solicitudId: 's1' }),
      expect.any(Function)
    );
  });
});
