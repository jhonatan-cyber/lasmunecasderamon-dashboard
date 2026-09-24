import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from '@/lib/services/AttendanceService';

vi.mock('@/lib/repositories/AttendanceRepository', () => ({
  AttendanceRepository: {
    register: vi.fn(),
    getByUser: vi.fn(),
    getByDates: vi.fn(),
    getHoy: vi.fn(),
    registerMasivoHoy: vi.fn(),
    getSummary: vi.fn(),
    registerManual: vi.fn(),
    getStats: vi.fn()
  }
}));

import { AttendanceRepository } from '@/lib/repositories/AttendanceRepository';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AttendanceService.registerAttendance', () => {
  it('valida qrData y delega al repositorio', async () => {
    const mockResult = { id: 'asist-1', usuario_id: 'user-1' };
    vi.mocked(AttendanceRepository.register).mockResolvedValue(mockResult as any);
    const currentUser = { id: 'user-1' };

    const result = await AttendanceService.registerAttendance(
      { qrData: 'QR-ABC123' },
      currentUser,
      '192.168.1.10'
    );

    expect(AttendanceRepository.register).toHaveBeenCalledWith(
      { qrData: 'QR-ABC123' },
      currentUser,
      '192.168.1.10'
    );
    expect(result).toEqual(mockResult);
  });

  it('lanza ZodError si qrData está vacío', async () => {
    await expect(
      AttendanceService.registerAttendance({ qrData: '' }, { id: 'user-1' })
    ).rejects.toThrow();
    expect(AttendanceRepository.register).not.toHaveBeenCalled();
  });

  it('lanza ZodError si falta qrData', async () => {
    await expect(AttendanceService.registerAttendance({} as any)).rejects.toThrow();
    expect(AttendanceRepository.register).not.toHaveBeenCalled();
  });

  it('permite omitir currentUser e ip', async () => {
    vi.mocked(AttendanceRepository.register).mockResolvedValue({ id: 'asist-1' } as any);

    await AttendanceService.registerAttendance({ qrData: 'QR-1' });

    expect(AttendanceRepository.register).toHaveBeenCalledWith(
      { qrData: 'QR-1' },
      undefined,
      undefined
    );
  });

  it('propaga errores del repositorio', async () => {
    vi.mocked(AttendanceRepository.register).mockRejectedValue(new Error('QR inválido'));

    await expect(
      AttendanceService.registerAttendance({ qrData: 'BAD' }, { id: 'u' })
    ).rejects.toThrow('QR inválido');
  });
});

describe('AttendanceService.getByUser', () => {
  it('delega al repositorio con filtros opcionales', async () => {
    const mockList = [{ id: 'asist-1' }];
    vi.mocked(AttendanceRepository.getByUser).mockResolvedValue(mockList as any);

    const result = await AttendanceService.getByUser(
      'user-1',
      'entrada',
      '2026-01-01',
      '2026-01-31'
    );

    expect(AttendanceRepository.getByUser).toHaveBeenCalledWith(
      'user-1',
      'entrada',
      '2026-01-01',
      '2026-01-31'
    );
    expect(result).toEqual(mockList);
  });

  it('permite llamar solo con userId', async () => {
    vi.mocked(AttendanceRepository.getByUser).mockResolvedValue([]);

    await AttendanceService.getByUser('user-1');

    expect(AttendanceRepository.getByUser).toHaveBeenCalledWith(
      'user-1',
      undefined,
      undefined,
      undefined
    );
  });
});

describe('AttendanceService.getByDates', () => {
  it('delega al repositorio con userId y fechas', async () => {
    const dates = ['2026-01-01', '2026-01-02'];
    const mockList = [{ fecha: '2026-01-01' }];
    vi.mocked(AttendanceRepository.getByDates).mockResolvedValue(mockList as any);

    const result = await AttendanceService.getByDates('user-1', dates);

    expect(AttendanceRepository.getByDates).toHaveBeenCalledWith('user-1', dates);
    expect(result).toEqual(mockList);
  });
});

describe('AttendanceService.getHoy', () => {
  it('delega al repositorio sin argumentos', async () => {
    const mockHoy = [{ usuario_id: 'user-1', hora: '09:00' }];
    vi.mocked(AttendanceRepository.getHoy).mockResolvedValue(mockHoy as any);

    const result = await AttendanceService.getHoy();

    expect(AttendanceRepository.getHoy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockHoy);
  });
});

describe('AttendanceService.registerMasivoHoy', () => {
  it('delega al repositorio con ip opcional', async () => {
    vi.mocked(AttendanceRepository.registerMasivoHoy).mockResolvedValue({ count: 5 } as any);

    const result = await AttendanceService.registerMasivoHoy('10.0.0.1');

    expect(AttendanceRepository.registerMasivoHoy).toHaveBeenCalledWith('10.0.0.1');
    expect(result).toMatchObject({ count: 5 });
  });

  it('permite omitir ip', async () => {
    vi.mocked(AttendanceRepository.registerMasivoHoy).mockResolvedValue(undefined as any);

    await AttendanceService.registerMasivoHoy();

    expect(AttendanceRepository.registerMasivoHoy).toHaveBeenCalledWith(undefined);
  });
});

describe('AttendanceService.getSummary', () => {
  it('delega al repositorio', async () => {
    const mockSummary = { presentes: 10, ausentes: 2 };
    vi.mocked(AttendanceRepository.getSummary).mockResolvedValue(mockSummary as any);

    const result = await AttendanceService.getSummary();

    expect(AttendanceRepository.getSummary).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockSummary);
  });
});

describe('AttendanceService.registerManual', () => {
  it('delega al repositorio con todos los parámetros', async () => {
    const user = { id: 'admin-1', rol: 'administrador' };
    vi.mocked(AttendanceRepository.registerManual).mockResolvedValue({ id: 'asist-1' } as any);

    const result = await AttendanceService.registerManual(
      'user-2',
      '2026-01-15',
      '08:30:00',
      '1',
      user
    );

    expect(AttendanceRepository.registerManual).toHaveBeenCalledWith(
      'user-2',
      '2026-01-15',
      '08:30:00',
      '1',
      user
    );
    expect(result).toMatchObject({ id: 'asist-1' });
  });
});

describe('AttendanceService.getStats', () => {
  it('delega al repositorio', async () => {
    const mockStats = { total: 100, promedio: 8.5 };
    vi.mocked(AttendanceRepository.getStats).mockResolvedValue(mockStats as any);

    const result = await AttendanceService.getStats();

    expect(AttendanceRepository.getStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockStats);
  });
});
