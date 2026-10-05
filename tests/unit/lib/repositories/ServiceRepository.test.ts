import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => {
  const queryMock = vi.fn();
  return { queryMock };
});

vi.mock('@/lib/database/db', () => ({
  generateUUID: () => 'mock-uuid',
  withTransaction: vi.fn(async (fn: any) => fn(repositoryHarness.queryMock)),
  query: repositoryHarness.queryMock
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: () => '2026-04-11 12:00:00',
  getSystemTimezone: () => 'America/Santiago'
}));

import { procesarAnulacionServicio } from '@/modules/operacion/servicios/anulaciones';
const ServiceRepository = { processAnulacion: procesarAnulacionServicio };

describe('ServiceRepository.processAnulacion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('actualiza solicitudes_anulacion_servicios y no tabla equivocada', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT servicio_id FROM solicitudes_anulacion_servicios')) {
        return [{ servicio_id: 'serv-1' }];
      }
      if (sql.includes('FROM servicios') && sql.includes('WHERE id_servicio = ?')) {
        return [
          {
            id_servicio: 'serv-1',
            estado: 2,
            habitacion_id: null,
            cliente_id: null,
            caja_id: null,
            metodo_pago: 'efectivo',
            total: 100,
            iva: 0,
            pagos_mixtos: null
          }
        ];
      }
      if (sql.includes('SUM(dc.comision)')) {
        return [{ total_comision: 0 }];
      }
      if (sql.includes('SELECT cliente_id FROM servicios')) return [{ cliente_id: null }];
      return [];
    });

    await ServiceRepository.processAnulacion('req-1', 'admin-1', 'aprobado');

    expect(repositoryHarness.queryMock).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE solicitudes_anulacion_servicios'),
      expect.any(Array)
    );
    expect(repositoryHarness.queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('UPDATE solicitudes_anulacion SET'),
      expect.any(Array)
    );
  });
});
