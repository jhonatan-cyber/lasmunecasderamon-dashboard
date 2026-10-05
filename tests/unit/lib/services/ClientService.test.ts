import { describe, it, expect, vi, beforeEach } from 'vitest';

// El servicio delega prepago al módulo, cuyo contrato importa el driver (valida
// entorno al cargarse). Se mockea porque el repositorio ya está mockeado.
vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'test-uuid',
  withTransaction: vi.fn(async (fn: any) => fn(vi.fn())),
  query: vi.fn()
}));

import { ClientService } from '@/workflows/clientes';

vi.mock('@/modules/clientes', () => ({
  crearCliente: vi.fn(),
  actualizarCliente: vi.fn(),
  obtenerHistorial: vi.fn(),
  obtenerCliente: vi.fn(),
  listarClientes: vi.fn(),
  eliminarCliente: vi.fn()
}));

vi.mock('@/workflows/prepago', () => ({ cargarPrepago: vi.fn(), devolverSaldo: vi.fn() }));
import { cargarPrepago, devolverSaldo as devolverSaldoModulo } from '@/workflows/prepago';

import {
  crearCliente,
  actualizarCliente,
  obtenerHistorial,
  obtenerCliente,
  listarClientes,
  eliminarCliente
} from '@/modules/clientes';

const validClient = {
  name: 'Ana',
  lastName: 'Rivas',
  run: '12345678-9',
  phone: '+56999999999'
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ClientService.createClient', () => {
  it('valida con Zod (omite id) y delega al repositorio', async () => {
    const mockClient = { id: 'cli-1', name: 'Ana', lastName: 'Rivas' };
    vi.mocked(crearCliente).mockResolvedValue(mockClient as any);

    const result = await ClientService.createClient(validClient as any);

    expect(crearCliente).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana', lastName: 'Rivas', run: '12345678-9' })
    );
    expect(result).toEqual(mockClient);
  });

  it('aplica defaults de saldo/deuda/status', async () => {
    vi.mocked(crearCliente).mockResolvedValue({ id: 'cli-1' } as any);

    await ClientService.createClient({ name: 'Ana', lastName: 'Rivas' } as any);

    const arg = vi.mocked(crearCliente).mock.calls[0][0];
    expect(arg).toMatchObject({ saldo: 0, deuda: 0, status: 1, phone: '' });
  });

  it('lanza ZodError si falta name', async () => {
    await expect(ClientService.createClient({ lastName: 'Rivas' } as any)).rejects.toThrow();
    expect(crearCliente).not.toHaveBeenCalled();
  });

  it('lanza ZodError si falta lastName', async () => {
    await expect(ClientService.createClient({ name: 'Ana' } as any)).rejects.toThrow();
    expect(crearCliente).not.toHaveBeenCalled();
  });
});

describe('ClientService.updateClient', () => {
  it('valida parcial y delega al repositorio', async () => {
    vi.mocked(actualizarCliente).mockResolvedValue({ id: 'cli-1', phone: 'nuevo' } as any);

    const result = await ClientService.updateClient('cli-1', { phone: '+56911111111' });

    expect(actualizarCliente).toHaveBeenCalledWith(
      'cli-1',
      expect.objectContaining({ phone: '+56911111111' })
    );
    expect(result).toMatchObject({ phone: 'nuevo' });
  });

  it('rechaza body con campos inválidos tipados', async () => {
    await expect(
      ClientService.updateClient('cli-1', { saldo: 'no-numero' } as any)
    ).rejects.toThrow();
    expect(actualizarCliente).not.toHaveBeenCalled();
  });
});

describe('ClientService.update', () => {
  it('convierte id numérico a string', async () => {
    vi.mocked(actualizarCliente).mockResolvedValue({ id: '42' } as any);

    await ClientService.update(42, { name: 'Pedro' });

    expect(actualizarCliente).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ name: 'Pedro' })
    );
  });

  it('acepta id string', async () => {
    vi.mocked(actualizarCliente).mockResolvedValue({ id: 'cli-1' } as any);

    await ClientService.update('cli-1', { name: 'Pedro' });

    expect(actualizarCliente).toHaveBeenCalledWith(
      'cli-1',
      expect.objectContaining({ name: 'Pedro' })
    );
  });
});

describe('ClientService.getHistory', () => {
  it('delega al repositorio con el clientId', async () => {
    const mockHistory = [{ id: 'mov-1', monto: 10000 }];
    vi.mocked(obtenerHistorial).mockResolvedValue(mockHistory as any);

    const result = await ClientService.getHistory('cli-1');

    expect(obtenerHistorial).toHaveBeenCalledWith('cli-1');
    expect(result).toEqual(mockHistory);
  });
});

describe('ClientService.addPrepago', () => {
  it('delega al modulo sin validar schema (flujo de dinero)', async () => {
    const prepago = {
      cliente_id: 'cli-1',
      monto: 50000,
      tipo: 'CARGA' as const,
      metodo_pago: 'efectivo',
      usuario_id: 'cajero-1'
    };
    vi.mocked(cargarPrepago).mockResolvedValue(undefined);

    const result = await ClientService.addPrepago(prepago);

    expect(cargarPrepago).toHaveBeenCalledWith(prepago);
    expect(result).toBeUndefined();
  });

  it('acepta pagos_mixtos', async () => {
    const prepago = {
      cliente_id: 'cli-1',
      monto: 30000,
      tipo: 'CARGA' as const,
      pagos_mixtos: [
        { metodo: 'efectivo', monto: 20000 },
        { metodo: 'tarjeta', monto: 10000 }
      ]
    };
    vi.mocked(cargarPrepago).mockResolvedValue(undefined);

    await ClientService.addPrepago(prepago);

    expect(cargarPrepago).toHaveBeenCalledWith(prepago);
  });

  it('propaga BusinessError de caja cerrada desde el modulo', async () => {
    const { BusinessError } = await import('@/lib/errors/errors');
    vi.mocked(cargarPrepago).mockRejectedValue(
      new BusinessError('NO_CAJA_ABIERTA', 'No hay caja abierta')
    );

    await expect(
      ClientService.addPrepago({
        cliente_id: 'cli-1',
        monto: 1000,
        tipo: 'CARGA'
      })
    ).rejects.toThrow(BusinessError);
  });
});

describe('ClientService.devolverSaldo', () => {
  it('delega al modulo con payload completo', async () => {
    const data = {
      cliente_id: 'cli-1',
      monto: 10000,
      metodo_pago: 'efectivo',
      motivo: 'cliente se retira',
      usuario_id: 'cajero-1'
    };
    vi.mocked(devolverSaldoModulo).mockResolvedValue(undefined);

    const result = await ClientService.devolverSaldo(data);

    expect(devolverSaldoModulo).toHaveBeenCalledWith(data);
    expect(result).toBeUndefined();
  });

  it('acepta motivo opcional', async () => {
    vi.mocked(devolverSaldoModulo).mockResolvedValue(undefined);

    await ClientService.devolverSaldo({
      cliente_id: 'cli-1',
      monto: 5000,
      metodo_pago: 'efectivo'
    });

    expect(devolverSaldoModulo).toHaveBeenCalledWith({
      cliente_id: 'cli-1',
      monto: 5000,
      metodo_pago: 'efectivo'
    });
  });
});

describe('ClientService.getById', () => {
  it('delega al repositorio con id string', async () => {
    const mockClient = { id: 'cli-1', name: 'Ana' };
    vi.mocked(obtenerCliente).mockResolvedValue(mockClient as any);

    const result = await ClientService.getById('cli-1');

    expect(obtenerCliente).toHaveBeenCalledWith('cli-1');
    expect(result).toEqual(mockClient);
  });

  it('convierte id numérico a string', async () => {
    vi.mocked(obtenerCliente).mockResolvedValue({ id: '7' } as any);

    await ClientService.getById(7);

    expect(obtenerCliente).toHaveBeenCalledWith('7');
  });
});

describe('ClientService.getAll', () => {
  it('delega al repositorio con params opcionales', async () => {
    const mockClients = [{ id: 'cli-1' }];
    vi.mocked(listarClientes).mockResolvedValue(mockClients as any);
    const params = { search: 'ana', limit: 10, conSaldo: true };

    const result = await ClientService.getAll(params);

    expect(listarClientes).toHaveBeenCalledWith({
      search: 'ana',
      limit: 10,
      offset: undefined,
      conSaldo: true
    });
    expect(result).toEqual(mockClients);
  });

  it('permite llamar sin params', async () => {
    vi.mocked(listarClientes).mockResolvedValue({ data: [], total: 0 } as any);

    await ClientService.getAll();

    expect(listarClientes).toHaveBeenCalledWith({
      search: undefined,
      limit: undefined,
      offset: undefined,
      conSaldo: undefined
    });
  });
});

describe('ClientService.delete', () => {
  it('delega al repositorio con id string', async () => {
    vi.mocked(eliminarCliente).mockResolvedValue(undefined as any);

    await ClientService.delete('cli-1');

    expect(eliminarCliente).toHaveBeenCalledWith('cli-1');
  });

  it('convierte id numérico a string', async () => {
    vi.mocked(eliminarCliente).mockResolvedValue(undefined as any);

    await ClientService.delete(99);

    expect(eliminarCliente).toHaveBeenCalledWith('99');
  });
});
