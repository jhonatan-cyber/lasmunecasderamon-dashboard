import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AccountService } from '@/modules/operacion/cuentas/fachada';

// El módulo de env valida al importarse y vitest no carga .env: se mockea para
// que el test no dependa del orden de ejecución en el worker.
vi.mock('@/lib/utils/env', () => ({
  validateJwtSecret: () => ({ valid: true, score: 100, reasons: [] }),
  env: {
    NODE_ENV: 'test',
    DB_HOST: '127.0.0.1',
    DB_USER: 'postgres',
    DB_PASSWORD: '',
    DB_NAME: 'lasmunecasderamon_test',
    DB_PORT: 5432,
    JWT_SECRET: 'test-secret-that-is-long-enough-for-validation',
    JWT_REFRESH_SECRET: 'test-refresh-that-is-long-enough-for-validation'
  }
}));

vi.mock('@/modules/operacion/cuentas/registro', () => ({
  CuentaRepository: {
    create: vi.fn(),
    getAll: vi.fn(),
    getById: vi.fn(),
    updateCuenta: vi.fn(),
    cobrar: vi.fn(),
    stopTimer: vi.fn(),
    finalizeRoomSession: vi.fn(),
    requestAnulacion: vi.fn(),
    delete: vi.fn()
  }
}));

import { CuentaRepository } from '@/modules/operacion/cuentas/registro';

const validCuenta = {
  codigo: 'C-001',
  total_comision: 100,
  sub_total: 1000,
  total: 1100,
  detalles: [{ producto_id: 'p1', precio: 1000, cantidad: 1, sub_total: 1000, comision: 100 }]
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AccountService.create', () => {
  it('valida con Zod y delega al repositorio', async () => {
    const mockCuenta = { id: 'cuenta-1', codigo: 'C-001' };
    vi.mocked(CuentaRepository.create).mockResolvedValue(mockCuenta as any);

    const result = await AccountService.create(validCuenta as any, 'user-1');

    expect(CuentaRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ codigo: 'C-001', total: 1100 }),
      'user-1'
    );
    expect(result).toEqual(mockCuenta);
  });

  it('lanza ZodError si el código está vacío', async () => {
    await expect(
      AccountService.create({ ...validCuenta, codigo: '' } as any, 'user-1')
    ).rejects.toThrow();
    expect(CuentaRepository.create).not.toHaveBeenCalled();
  });

  it('lanza ZodError si detalles no es un array', async () => {
    await expect(
      AccountService.create({ ...validCuenta, detalles: 'nope' } as any, 'user-1')
    ).rejects.toThrow();
    expect(CuentaRepository.create).not.toHaveBeenCalled();
  });

  it('propaga errores del repositorio', async () => {
    vi.mocked(CuentaRepository.create).mockRejectedValue(new Error('DB down'));

    await expect(AccountService.create(validCuenta as any, 'user-1')).rejects.toThrow('DB down');
  });
});

describe('AccountService.createAccountMovement (deprecated)', () => {
  it('delega a create()', async () => {
    const mockCuenta = { id: 'cuenta-1' };
    vi.mocked(CuentaRepository.create).mockResolvedValue(mockCuenta as any);

    const result = await AccountService.createAccountMovement(validCuenta as any, 'user-1');

    expect(CuentaRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockCuenta);
  });
});

describe('AccountService.getAll', () => {
  it('delega al repositorio con filtros opcionales', async () => {
    const mockList = [{ id: 'cuenta-1' }];
    vi.mocked(CuentaRepository.getAll).mockResolvedValue(mockList as any);

    const result = await AccountService.getAll('mesa', '1');

    expect(CuentaRepository.getAll).toHaveBeenCalledWith('mesa', '1');
    expect(result).toEqual(mockList);
  });

  it('permite llamar sin filtros', async () => {
    vi.mocked(CuentaRepository.getAll).mockResolvedValue([]);

    await AccountService.getAll();

    expect(CuentaRepository.getAll).toHaveBeenCalledWith(undefined, undefined);
  });
});

describe('AccountService.getById', () => {
  it('delega al repositorio con el id correcto', async () => {
    const mockCuenta = { id: 'cuenta-1' };
    vi.mocked(CuentaRepository.getById).mockResolvedValue(mockCuenta as any);

    const result = await AccountService.getById('cuenta-1');

    expect(CuentaRepository.getById).toHaveBeenCalledWith('cuenta-1');
    expect(result).toEqual(mockCuenta);
  });
});

describe('AccountService.updateCuenta', () => {
  it('delega al repositorio con id, body y user', async () => {
    const body = { total: 5000 } as any;
    vi.mocked(CuentaRepository.updateCuenta).mockResolvedValue({ id: 'cuenta-1' } as any);

    await AccountService.updateCuenta('cuenta-1', body, 'user-1');

    expect(CuentaRepository.updateCuenta).toHaveBeenCalledWith('cuenta-1', body, 'user-1');
  });
});

describe('AccountService.cobrar', () => {
  it('delega al repositorio con id, body y cobrador', async () => {
    const body = { metodo_pago: 'efectivo', monto: 1100 } as any;
    vi.mocked(CuentaRepository.cobrar).mockResolvedValue({ id: 'cuenta-1', estado: 0 } as any);

    const result = await AccountService.cobrar('cuenta-1', body, 'cajero-1');

    expect(CuentaRepository.cobrar).toHaveBeenCalledWith('cuenta-1', body, 'cajero-1');
    expect(result).toMatchObject({ estado: 0 });
  });
});

describe('AccountService.stopTimer', () => {
  it('delega al repositorio', async () => {
    vi.mocked(CuentaRepository.stopTimer).mockResolvedValue({ id: 'cuenta-1', tiempo: 0 } as any);

    await AccountService.stopTimer('cuenta-1', 'user-1');

    expect(CuentaRepository.stopTimer).toHaveBeenCalledWith('cuenta-1', 'user-1');
  });
});

describe('AccountService.finalizeRoomSession', () => {
  it('delega al repositorio con id y opcional nowStr', async () => {
    vi.mocked(CuentaRepository.finalizeRoomSession).mockResolvedValue(undefined as any);

    await AccountService.finalizeRoomSession('cuenta-1', '2026-01-01 10:00:00');

    expect(CuentaRepository.finalizeRoomSession).toHaveBeenCalledWith(
      'cuenta-1',
      '2026-01-01 10:00:00'
    );
  });

  it('permite omitir nowStr', async () => {
    vi.mocked(CuentaRepository.finalizeRoomSession).mockResolvedValue(undefined as any);

    await AccountService.finalizeRoomSession('cuenta-1');

    expect(CuentaRepository.finalizeRoomSession).toHaveBeenCalledWith('cuenta-1', undefined);
  });
});

describe('AccountService.requestAnulacion', () => {
  it('delega al repositorio con todos los parámetros', async () => {
    vi.mocked(CuentaRepository.requestAnulacion).mockResolvedValue('solicitud-1' as any);

    const result = await AccountService.requestAnulacion(
      'cuenta-1',
      'error de cobro',
      'user-1',
      1100
    );

    expect(CuentaRepository.requestAnulacion).toHaveBeenCalledWith(
      'cuenta-1',
      'error de cobro',
      'user-1',
      1100
    );
    expect(result).toBe('solicitud-1');
  });
});

describe('AccountService.delete', () => {
  it('delega al repositorio con el id correcto', async () => {
    vi.mocked(CuentaRepository.delete).mockResolvedValue(undefined as any);

    await AccountService.delete('cuenta-1');

    expect(CuentaRepository.delete).toHaveBeenCalledWith('cuenta-1');
  });

  it('propaga NotFoundError del repositorio', async () => {
    const { NotFoundError } = await import('@/lib/errors/errors');
    vi.mocked(CuentaRepository.delete).mockRejectedValue(new NotFoundError('Cuenta no existe'));

    await expect(AccountService.delete('no-existe')).rejects.toThrow(NotFoundError);
  });
});
