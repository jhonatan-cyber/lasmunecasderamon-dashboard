// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Adaptador HTTP de solicitudes de servicio.
 *
 * Se mockean `withRoute` (auth/auditoría y mapeo de errores), el módulo y el
 * SSE: acá se prueba la orquestación de la ruta —exigir el baucher cuando el
 * pago es transferencia y pasarlo al módulo—, no la lógica del módulo.
 */

const operacion = vi.hoisted(() => ({
  ServiceRequestService: { create: vi.fn(), getAll: vi.fn(), delete: vi.fn() }
}));
const sse = vi.hoisted(() => ({ sendNotificationToAll: vi.fn() }));

vi.mock('@/lib/api/withRoute', () => ({
  withRoute: (configOrHandler: unknown, maybeHandler?: unknown) => {
    const handler = (typeof configOrHandler === 'function' ? configOrHandler : maybeHandler) as (
      request: Request,
      contexto: unknown
    ) => Promise<Response>;
    // Reproduce el manejo de errores del `withRoute` real: el error de dominio
    // sale como respuesta HTTP en lugar de propagarse.
    return async (request: Request) => {
      try {
        return await handler(request, { user: { id: 'user-1' }, params: {} });
      } catch (error) {
        return ApiResponse.error(error as Error);
      }
    };
  },
  withPublicRoute: (handler: unknown) => handler
}));
vi.mock('@/modules/operacion', () => operacion);
vi.mock('@/lib/api/sseService', () => sse);

import { ApiResponse } from '@/lib/api/api-response';
import { POST } from '@/app/api/service-requests/route';

type Handler = (request: Request) => Promise<Response>;

function solicitud(body: Record<string, unknown>) {
  return new Request('http://localhost/api/service-requests', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
}

const BASE = {
  codigo: 'SERV0001',
  habitacion_id: 'h1',
  anfitrionas_ids: ['u7'],
  precio_servicio: 20000,
  precio_habitacion: 50000,
  comision_anfitriona: 0,
  num_clientes: 1,
  metodo_pago: 'efectivo',
  tiempo: 60,
  total: 70000,
  iva: 0
};

beforeEach(() => {
  vi.clearAllMocks();
  operacion.ServiceRequestService.create.mockResolvedValue({
    id: 'sol-1',
    habitacion_nombre: 'Suite',
    cliente_nombre: null
  });
});

describe('POST /api/service-requests', () => {
  it('exige la foto del baucher cuando el pago es transferencia', async () => {
    const response = await (POST as Handler)(solicitud({ ...BASE, metodo_pago: 'transferencia' }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/necesita la foto del baucher/);
    expect(operacion.ServiceRequestService.create).not.toHaveBeenCalled();
    expect(sse.sendNotificationToAll).not.toHaveBeenCalled();
  });

  it('pasa la foto del baucher al módulo cuando el pago es transferencia', async () => {
    const response = await (POST as Handler)(
      solicitud({
        ...BASE,
        metodo_pago: 'transferencia',
        baucher_foto: 'data:image/jpeg;base64,SG9sYQ=='
      })
    );

    expect(response.status).toBe(201);
    expect(operacion.ServiceRequestService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        metodo_pago: 'transferencia',
        baucher_foto: 'data:image/jpeg;base64,SG9sYQ=='
      }),
      'user-1'
    );
    expect(sse.sendNotificationToAll).toHaveBeenCalledWith(
      'new_service_request',
      expect.objectContaining({ id: 'sol-1' })
    );
  });

  it('rechaza un baucher que no es una imagen', async () => {
    const response = await (POST as Handler)(
      solicitud({
        ...BASE,
        metodo_pago: 'transferencia',
        baucher_foto: 'https://cdn.example.com/baucher.jpg'
      })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toMatch(/imagen válida/);
    expect(operacion.ServiceRequestService.create).not.toHaveBeenCalled();
  });

  it('rechaza un baucher en un formato que no está admitido', async () => {
    const response = await (POST as Handler)(
      solicitud({
        ...BASE,
        metodo_pago: 'transferencia',
        baucher_foto: 'data:application/pdf;base64,SG9sYQ=='
      })
    );

    expect(response.status).toBe(400);
    expect(operacion.ServiceRequestService.create).not.toHaveBeenCalled();
  });

  it('no pide baucher cuando el pago no es transferencia', async () => {
    const response = await (POST as Handler)(solicitud(BASE));

    expect(response.status).toBe(201);
    expect(operacion.ServiceRequestService.create).toHaveBeenCalledWith(
      expect.not.objectContaining({ baucher_foto: expect.anything() }),
      'user-1'
    );
  });
});
