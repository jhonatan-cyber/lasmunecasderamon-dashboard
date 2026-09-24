import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClientService } from '@/lib/services/ClientService';

vi.mock('@/lib/repositories/ClientRepository', () => ({
  ClientRepository: {
    create: vi.fn(),
    update: vi.fn(),
    getHistory: vi.fn(),
    addPrepago: vi.fn(),
    devolverSaldo: vi.fn(),
    getById: vi.fn(),
    getAll: vi.fn(),
    delete: vi.fn()
  }
}));

import { ClientRepository } from '@/lib/repositories/ClientRepository';

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
    vi.mocked(ClientRepository.create).mockResolvedValue(mockClient as any);

    const result = await ClientService.createClient(validClient as any);

    expect(ClientRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Ana', lastName: 'Rivas', run: '12345678-9' })
    );
    expect(result).toEqual(mockClient);
  });

  it('aplica defaults de saldo/deuda/status', async () => {
    vi.mocked(ClientRepository.create).mockResolvedValue({ id: 'cli-1' } as any);

    await ClientService.createClient({ name: 'Ana', lastName: 'Rivas' } as any);

    const arg = vi.mocked(ClientRepository.create).mock.calls[0][0];
    expect(arg).toMatchObject({ saldo: 0, deuda: 0, status: 1, phone: '' });
  });

  it('lanza ZodError si falta name', async () => {
    await expect(ClientService.createClient({ lastName: 'Rivas' } as any)).rejects.toThrow();
    expect(ClientRepository.create).not.toHaveBeenCalled();
  });

  it('lanza ZodError si falta lastName', async () => {
    await expect(ClientService.createClient({ name: 'Ana' } as any)).rejects.toThrow();
    expect(ClientRepository.create).not.toHaveBeenCalled();
  });
});

describe('ClientService.updateClient', () => {
  it('valida parcial y delega al repositorio', async () => {
    vi.mocked(ClientRepository.update).mockResolvedValue({ id: 'cli-1', phone: 'nuevo' } as any);

    const result = await ClientService.updateClient('cli-1', { phone: '+56911111111' });

    expect(ClientRepository.update).toHaveBeenCalledWith(
      'cli-1',
      expect.objectContaining({ phone: '+56911111111' })
    );
    expect(result).toMatchObject({ phone: 'nuevo' });
  });

  it('rechaza body con campos inválidos tipados', async () => {
    await expect(
      ClientService.updateClient('cli-1', { saldo: 'no-numero' } as any)
    ).rejects.toThrow();
    expect(ClientRepository.update).not.toHaveBeenCalled();
  });
});

describe('ClientService.update', () => {
  it('convierte id numérico a string', async () => {
    vi.mocked(ClientRepository.update).mockResolvedValue({ id: '42' } as any);

    await ClientService.update(42, { name: 'Pedro' });

    expect(ClientRepository.update).toHaveBeenCalledWith(
      '42',
      expect.objectContaining({ name: 'Pedro' })
    );
  });

  it('acepta id string', async () => {
    vi.mocked(ClientRepository.update).mockResolvedValue({ id: 'cli-1' } as any);

    await ClientService.update('cli-1', { name: 'Pedro' });

    expect(ClientRepository.update).toHaveBeenCalledWith(
      'cli-1',
      expect.objectContaining({ name: 'Pedro' })
    );
  });
});

describe('ClientService.getHistory', () => {
  it('delega al repositorio con el clientId', async () => {
    const mockHistory = [{ id: 'mov-1', monto: 10000 }];
    vi.mocked(ClientRepository.getHistory).mockResolvedValue(mockHistory as any);

    const result = await ClientService.getHistory('cli-1');

    expect(ClientRepository.getHistory).toHaveBeenCalledWith('cli-1');
    expect(result).toEqual(mockHistory);
  });
});

describe('ClientService.addPrepago', () => {
  it('delega al repositorio sin validar schema (flujo de dinero)', async () => {
    const prepago = {
      cliente_id: 'cli-1',
      monto: 50000,
      tipo: 'CARGA' as const,
      metodo_pago: 'efectivo',
      usuario_id: 'cajero-1'
    };
    vi.mocked(ClientRepository.addPrepago).mockResolvedValue({ id: 'mov-1', saldo: 50000 } as any);

    const result = await ClientService.addPrepago(prepago);

    expect(ClientRepository.addPrepago).toHaveBeenCalledWith(prepago);
    expect(result).toMatchObject({ saldo: 50000 });
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
    vi.mocked(ClientRepository.addPrepago).mockResolvedValue({} as any);

    await ClientService.addPrepago(prepago);

    expect(ClientRepository.addPrepago).toHaveBeenCalledWith(prepago);
  });

  it('propaga BusinessError de caja cerrada desde el repo', async () => {
    const { BusinessError } = await import('@/lib/errors/errors');
    vi.mocked(ClientRepository.addPrepago).mockRejectedValue(
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
  it('delega al repositorio con payload completo', async () => {
    const data = {
      cliente_id: 'cli-1',
      monto: 10000,
      metodo_pago: 'efectivo',
      motivo: 'cliente se retira',
      usuario_id: 'cajero-1'
    };
    vi.mocked(ClientRepository.devolverSaldo).mockResolvedValue({ id: 'mov-2' } as any);

    const result = await ClientService.devolverSaldo(data);

    expect(ClientRepository.devolverSaldo).toHaveBeenCalledWith(data);
    expect(result).toMatchObject({ id: 'mov-2' });
  });

  it('acepta motivo opcional', async () => {
    vi.mocked(ClientRepository.devolverSaldo).mockResolvedValue({} as any);

    await ClientService.devolverSaldo({
      cliente_id: 'cli-1',
      monto: 5000,
      metodo_pago: 'efectivo'
    });

    expect(ClientRepository.devolverSaldo).toHaveBeenCalledWith({
      cliente_id: 'cli-1',
      monto: 5000,
      metodo_pago: 'efectivo'
    });
  });
});

describe('ClientService.getById', () => {
  it('delega al repositorio con id string', async () => {
    const mockClient = { id: 'cli-1', name: 'Ana' };
    vi.mocked(ClientRepository.getById).mockResolvedValue(mockClient as any);

    const result = await ClientService.getById('cli-1');

    expect(ClientRepository.getById).toHaveBeenCalledWith('cli-1');
    expect(result).toEqual(mockClient);
  });

  it('convierte id numérico a string', async () => {
    vi.mocked(ClientRepository.getById).mockResolvedValue({ id: '7' } as any);

    await ClientService.getById(7);

    expect(ClientRepository.getById).toHaveBeenCalledWith('7');
  });
});

describe('ClientService.getAll', () => {
  it('delega al repositorio con params opcionales', async () => {
    const mockClients = [{ id: 'cli-1' }];
    vi.mocked(ClientRepository.getAll).mockResolvedValue(mockClients as any);
    const params = { term: 'ana', status: 1 };

    const result = await ClientService.getAll(params);

    expect(ClientRepository.getAll).toHaveBeenCalledWith(params);
    expect(result).toEqual(mockClients);
  });

  it('permite llamar sin params', async () => {
    vi.mocked(ClientRepository.getAll).mockResolvedValue({ data: [], total: 0 } as any);

    await ClientService.getAll();

    expect(ClientRepository.getAll).toHaveBeenCalledWith(undefined);
  });
});

describe('ClientService.delete', () => {
  it('delega al repositorio con id string', async () => {
    vi.mocked(ClientRepository.delete).mockResolvedValue(undefined as any);

    await ClientService.delete('cli-1');

    expect(ClientRepository.delete).toHaveBeenCalledWith('cli-1');
  });

  it('convierte id numérico a string', async () => {
    vi.mocked(ClientRepository.delete).mockResolvedValue(undefined as any);

    await ClientService.delete(99);

    expect(ClientRepository.delete).toHaveBeenCalledWith('99');
  });
});
