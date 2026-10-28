// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Persistencia del baucher en solicitudes de servicio.
 *
 * La foto viaja en data URL dentro del payload, se guarda como archivo con la
 * misma rutina que pedidos y entradas, y en la fila solo queda el nombre. Si
 * el archivo no se guarda, la solicitud no se crea: perder la foto sería
 * perder la constancia del pago.
 */

const db = vi.hoisted(() => ({
  query: vi.fn(),
  generateUUID: vi.fn()
}));
vi.mock('@/lib/database/db', () => db);

const baucher = vi.hoisted(() => ({
  guardarFotoBaucher: vi.fn(),
  eliminarFotoBaucher: vi.fn()
}));
vi.mock('@/lib/utils/image-utils', () => baucher);

vi.mock('@/lib/business/timezoneService', async importOriginal => ({
  // Mock parcial: `formatters` (transversal) necesita `getSystemTimezone` al importarse.
  ...(await importOriginal<object>()),
  getNowInBusinessTimezone: vi.fn(() => '2026-10-26 18:00:00')
}));

vi.mock('@/lib/business/habitaciones', () => ({
  esHabitacionSoloVentas: vi.fn(() => false)
}));

const logger = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn()
}));
vi.mock('@/lib/utils/logger', () => ({ logger, default: logger }));

import { BusinessError } from '@/lib/errors/errors';
import { ServiceRequestRepository } from '@/modules/operacion/solicitudes/repositorio';

const FOTO = 'data:image/jpeg;base64,SG9sYQ==';

const PAYLOAD = {
  codigo: 'SERV0001',
  cliente_id: null,
  habitacion_id: 'h1',
  precio_servicio: 20000,
  precio_habitacion: 50000,
  comision_anfitriona: 0,
  anfitrionas_ids: [7],
  num_clientes: 1,
  metodo_pago: 'transferencia',
  tiempo: 60,
  total: 70000,
  iva: 0,
  baucher_foto: FOTO
};

function insertDeSolicitud() {
  const call = db.query.mock.calls.find(([sql]) =>
    String(sql).includes('INSERT INTO solicitudes_servicios')
  );
  expect(call, 'no se ejecutó el INSERT de la solicitud').toBeDefined();
  return { sql: String(call![0]), params: call![1] as unknown[] };
}

beforeEach(() => {
  vi.clearAllMocks();
  db.generateUUID.mockReturnValue('uuid-1');
  db.query.mockImplementation(async (sql: string) => {
    if (String(sql).includes('as habitacion_nombre'))
      return [{ habitacion_nombre: 'Suite', cliente_nombre: 'Ana' }];
    if (String(sql).includes('FROM habitaciones'))
      return [{ precio: 50000, comision_anfitriona: 0, tiempo: 60 }];
    return [];
  });
  baucher.eliminarFotoBaucher.mockResolvedValue(undefined);
});

describe('ServiceRequestRepository.create · baucher', () => {
  it('guarda la foto como archivo y deja solo el nombre en la fila', async () => {
    baucher.guardarFotoBaucher.mockResolvedValue('order_1718.webp');

    const result = await ServiceRequestRepository.create(PAYLOAD, 'user-1');

    expect(baucher.guardarFotoBaucher).toHaveBeenCalledWith(FOTO, 'order', {
      codigo: 'SERV0001'
    });
    const { sql, params } = insertDeSolicitud();
    expect(sql).toContain('baucher_foto');
    expect(params).toContain('order_1718.webp');
    expect(result.id).toBe('uuid-1');
    expect(baucher.eliminarFotoBaucher).not.toHaveBeenCalled();
  });

  it('sin foto no se escribe ningún archivo y la columna queda null', async () => {
    await ServiceRequestRepository.create(
      { ...PAYLOAD, metodo_pago: 'efectivo', baucher_foto: undefined },
      'user-1'
    );

    expect(baucher.guardarFotoBaucher).not.toHaveBeenCalled();
    const { params } = insertDeSolicitud();
    expect(params[params.length - 1]).toBeNull();
  });

  it('si la foto no se guarda, no se crea la solicitud', async () => {
    baucher.guardarFotoBaucher.mockRejectedValue(
      new BusinessError('No se pudo guardar la foto del baucher', 'BAUCHER_SAVE_FAILED')
    );

    await expect(ServiceRequestRepository.create(PAYLOAD, 'user-1')).rejects.toThrow(
      'No se pudo guardar la foto del baucher'
    );

    const huboInsert = db.query.mock.calls.some(([sql]) =>
      String(sql).includes('INSERT INTO solicitudes_servicios')
    );
    expect(huboInsert).toBe(false);
  });

  it('si el alta falla después de guardar la foto, el archivo huérfano se borra', async () => {
    baucher.guardarFotoBaucher.mockResolvedValue('order_1718.webp');
    db.query.mockImplementation(async (sql: string) => {
      if (String(sql).includes('INSERT INTO solicitudes_servicios'))
        throw new Error('connection lost');
      if (String(sql).includes('FROM habitaciones'))
        return [{ precio: 50000, comision_anfitriona: 0, tiempo: 60 }];
      return [];
    });

    await expect(ServiceRequestRepository.create(PAYLOAD, 'user-1')).rejects.toThrow(
      'Error al crear solicitud de servicio'
    );

    expect(baucher.eliminarFotoBaucher).toHaveBeenCalledWith('order_1718.webp', 'order', {
      codigo: 'SERV0001'
    });
  });
});
