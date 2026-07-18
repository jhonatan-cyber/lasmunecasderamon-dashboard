import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OvertimeService } from '@/lib/services/OvertimeService';

vi.mock('@/lib/repositories/OvertimeRepository', () => ({
  OvertimeRepository: {
    getAll: vi.fn(),
    getByUser: vi.fn(),
    getByDates: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() }
}));

import { OvertimeRepository } from '@/lib/repositories/OvertimeRepository';

beforeEach(() => {
  vi.clearAllMocks();
});

const validData = { usuario_id: 'user-1', hora: 2 };

describe('OvertimeService.getAll', () => {
  it('calls repository with filters', async () => {
    vi.mocked(OvertimeRepository.getAll).mockResolvedValue([]);
    await OvertimeService.getAll('user-1', '2024-01-01', '2024-01-31');
    expect(OvertimeRepository.getAll).toHaveBeenCalledWith('user-1', '2024-01-01', '2024-01-31');
  });

  it('calls repository without filters', async () => {
    vi.mocked(OvertimeRepository.getAll).mockResolvedValue([]);
    await OvertimeService.getAll();
    expect(OvertimeRepository.getAll).toHaveBeenCalledWith(undefined, undefined, undefined);
  });
});

describe('OvertimeService.getByUser', () => {
  it('calls repository with userId', async () => {
    vi.mocked(OvertimeRepository.getByUser).mockResolvedValue([]);
    await OvertimeService.getByUser('user-1');
    expect(OvertimeRepository.getByUser).toHaveBeenCalledWith('user-1', undefined, undefined, undefined);
  });
});

describe('OvertimeService.getByDates', () => {
  it('calls repository with userId and dates', async () => {
    vi.mocked(OvertimeRepository.getByDates).mockResolvedValue([]);
    const dates = ['2024-01-01', '2024-01-02'];
    await OvertimeService.getByDates('user-1', dates);
    expect(OvertimeRepository.getByDates).toHaveBeenCalledWith('user-1', dates);
  });
});

describe('OvertimeService.create', () => {
  it('creates overtime with validated data', async () => {
    vi.mocked(OvertimeRepository.create).mockResolvedValue({ id: 'ot-1' } as any);
    const result = await OvertimeService.create({ ...validData, monto: 15000, device_date: '2024-01-01' });
    expect(OvertimeRepository.create).toHaveBeenCalledWith({ usuario_id: 'user-1', hora: 2, monto: 15000, device_date: '2024-01-01' });
    expect(result).toMatchObject({ id: 'ot-1' });
  });
});

describe('OvertimeService.update', () => {
  it('calls repository with id and data', async () => {
    await OvertimeService.update('ot-1', { hora: 3, monto: 20000 });
    expect(OvertimeRepository.update).toHaveBeenCalledWith('ot-1', { hora: 3, monto: 20000 });
  });
});

describe('OvertimeService.delete', () => {
  it('calls repository with id', async () => {
    await OvertimeService.delete('ot-1');
    expect(OvertimeRepository.delete).toHaveBeenCalledWith('ot-1');
  });
});
