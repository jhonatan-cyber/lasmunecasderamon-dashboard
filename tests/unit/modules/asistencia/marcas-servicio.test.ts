import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registrarAsistencia,
  listarAsistenciasDeUsuario,
  listarAsistenciasPorFechas,
  listarAsistenciasDeHoy,
  registrarAsistenciaMasivaDeHoy,
  listarResumenAsistencias,
  registrarAsistenciaManual,
  consultarEstadisticasAsistencia,
  consultarVentana
} from '@/modules/asistencia/marcas/servicio';
import type { Actor } from '@/modules/identidad/contracts';

vi.mock('@/modules/asistencia/marcas/repositorio', () => ({
  registerAttendance: vi.fn(),
  getAttendanceByUser: vi.fn(),
  getAttendanceByDates: vi.fn(),
  getAttendanceHoy: vi.fn(),
  registerMasivoHoy: vi.fn(),
  getAttendanceSummary: vi.fn(),
  getAttendanceManual: vi.fn(),
  registerAttendanceManual: vi.fn(),
  getAttendanceStats: vi.fn(),
  getAttendanceConfigHours: vi.fn()
}));

import * as repositorio from '@/modules/asistencia/marcas/repositorio';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('registrarAsistencia', () => {
  it('valida qrData y delega en el repositorio con actor e ip', async () => {
    const mockResult = { id: 'asist-1', usuario_id: 'user-1' };
    vi.mocked(repositorio.registerAttendance).mockResolvedValue(mockResult as any);
    const actor = { id: 'user-1' } as Actor;

    const result = await registrarAsistencia({ qrData: 'QR-ABC123' }, actor, '192.168.1.10');

    expect(repositorio.registerAttendance).toHaveBeenCalledWith(
      { qrData: 'QR-ABC123' },
      actor,
      '192.168.1.10'
    );
    expect(result).toEqual(mockResult);
  });

  it('lanza ZodError si qrData está vacío', async () => {
    await expect(registrarAsistencia({ qrData: '' }, { id: 'user-1' })).rejects.toThrow();
    expect(repositorio.registerAttendance).not.toHaveBeenCalled();
  });

  it('lanza ZodError si falta qrData', async () => {
    await expect(registrarAsistencia({} as any)).rejects.toThrow();
    expect(repositorio.registerAttendance).not.toHaveBeenCalled();
  });

  it('permite omitir actor e ip', async () => {
    vi.mocked(repositorio.registerAttendance).mockResolvedValue({ id: 'asist-1' } as any);

    await registrarAsistencia({ qrData: 'QR-1' });

    expect(repositorio.registerAttendance).toHaveBeenCalledWith(
      { qrData: 'QR-1' },
      undefined,
      undefined
    );
  });

  it('propaga errores del repositorio', async () => {
    vi.mocked(repositorio.registerAttendance).mockRejectedValue(new Error('QR inválido'));

    await expect(registrarAsistencia({ qrData: 'BAD' }, { id: 'u' })).rejects.toThrow(
      'QR inválido'
    );
  });
});

describe('listarAsistenciasDeUsuario', () => {
  it('delega al repositorio con filtros opcionales', async () => {
    const mockList = [{ id: 'asist-1' }];
    vi.mocked(repositorio.getAttendanceByUser).mockResolvedValue(mockList as any);

    const result = await listarAsistenciasDeUsuario(
      'user-1',
      'entrada',
      '2026-01-01',
      '2026-01-31'
    );

    expect(repositorio.getAttendanceByUser).toHaveBeenCalledWith(
      'user-1',
      'entrada',
      '2026-01-01',
      '2026-01-31'
    );
    expect(result).toEqual(mockList);
  });

  it('permite llamar solo con usuarioId', async () => {
    vi.mocked(repositorio.getAttendanceByUser).mockResolvedValue([]);

    await listarAsistenciasDeUsuario('user-1');

    expect(repositorio.getAttendanceByUser).toHaveBeenCalledWith(
      'user-1',
      undefined,
      undefined,
      undefined
    );
  });
});

describe('listarAsistenciasPorFechas', () => {
  it('delega al repositorio con usuarioId y fechas', async () => {
    const dates = ['2026-01-01', '2026-01-02'];
    const mockList = [{ fecha: '2026-01-01' }];
    vi.mocked(repositorio.getAttendanceByDates).mockResolvedValue(mockList as any);

    const result = await listarAsistenciasPorFechas('user-1', dates);

    expect(repositorio.getAttendanceByDates).toHaveBeenCalledWith('user-1', dates);
    expect(result).toEqual(mockList);
  });
});

describe('listarAsistenciasDeHoy', () => {
  it('delega al repositorio sin argumentos', async () => {
    const mockHoy = [{ usuario_id: 'user-1', hora: '09:00' }];
    vi.mocked(repositorio.getAttendanceHoy).mockResolvedValue(mockHoy as any);

    const result = await listarAsistenciasDeHoy();

    expect(repositorio.getAttendanceHoy).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockHoy);
  });
});

describe('registrarAsistenciaMasivaDeHoy', () => {
  it('delega al repositorio con ip opcional', async () => {
    vi.mocked(repositorio.registerMasivoHoy).mockResolvedValue({ count: 5 } as any);

    const result = await registrarAsistenciaMasivaDeHoy('10.0.0.1');

    expect(repositorio.registerMasivoHoy).toHaveBeenCalledWith('10.0.0.1');
    expect(result).toMatchObject({ count: 5 });
  });

  it('permite omitir ip', async () => {
    vi.mocked(repositorio.registerMasivoHoy).mockResolvedValue(undefined as any);

    await registrarAsistenciaMasivaDeHoy();

    expect(repositorio.registerMasivoHoy).toHaveBeenCalledWith(undefined);
  });
});

describe('listarResumenAsistencias', () => {
  it('delega al repositorio', async () => {
    const mockSummary = { presentes: 10, ausentes: 2 };
    vi.mocked(repositorio.getAttendanceSummary).mockResolvedValue(mockSummary as any);

    const result = await listarResumenAsistencias();

    expect(repositorio.getAttendanceSummary).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockSummary);
  });
});

describe('registrarAsistenciaManual', () => {
  it('delega al repositorio con todos los parámetros', async () => {
    const actor = { id: 'admin-1', rol: 'administrador' } as Actor;
    vi.mocked(repositorio.registerAttendanceManual).mockResolvedValue({ id: 'asist-1' } as any);

    const result = await registrarAsistenciaManual('user-2', '2026-01-15', '08:30:00', '1', actor);

    expect(repositorio.registerAttendanceManual).toHaveBeenCalledWith(
      'user-2',
      '2026-01-15',
      '08:30:00',
      '1',
      actor
    );
    expect(result).toMatchObject({ id: 'asist-1' });
  });
});

describe('consultarEstadisticasAsistencia', () => {
  it('delega al repositorio', async () => {
    const mockStats = { total: 100, promedio: 8.5 };
    vi.mocked(repositorio.getAttendanceStats).mockResolvedValue(mockStats as any);

    const result = await consultarEstadisticasAsistencia();

    expect(repositorio.getAttendanceStats).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockStats);
  });
});

describe('consultarVentana', () => {
  it('devuelve la ventana horaria vigente (asistencia_hora_inicio/fin)', async () => {
    const ventana = { startHour: 21, endHour: 23 };
    vi.mocked(repositorio.getAttendanceConfigHours).mockResolvedValue(ventana);

    const result = await consultarVentana();

    expect(repositorio.getAttendanceConfigHours).toHaveBeenCalledTimes(1);
    expect(result).toEqual(ventana);
  });
});
