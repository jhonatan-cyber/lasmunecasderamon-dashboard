import { beforeEach, describe, expect, it, vi } from 'vitest';

const reportHarness = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: reportHarness.queryMock,
  withTransaction: vi.fn()
}));

import { getSalesReport } from '@/modules/reportes/informes/ventas';

describe('getSalesReport · shots separados por audiencia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('expone el monto y la cantidad de shots de cliente y de anfitriona', async () => {
    reportHarness.queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes('montoAnfitriona')) {
        return [
          {
            montoCliente: 10000,
            cantidadCliente: 2,
            montoAnfitriona: 6000,
            cantidadAnfitriona: 2
          }
        ];
      }
      if (String(sql).includes('GROUP BY DATE')) return [];
      return [{ totalVentas: 16000, cantidadVentas: 1 }];
    });

    const report = await getSalesReport('today');

    expect(report.shots).toEqual({
      cliente: { monto: 10000, cantidad: 2 },
      anfitriona: { monto: 6000, cantidad: 2 }
    });
    expect(report.totalVentas).toBe(16000);
  });

  it('deja el desglose en cero cuando no hubo shots', async () => {
    reportHarness.queryMock.mockResolvedValue([]);

    const report = await getSalesReport('month');

    expect(report.shots).toEqual({
      cliente: { monto: 0, cantidad: 0 },
      anfitriona: { monto: 0, cantidad: 0 }
    });
  });

  it('la consulta de shots respeta el estado de la venta y el rango del reporte', async () => {
    reportHarness.queryMock.mockResolvedValue([]);

    await getSalesReport('today');

    const shotsSql = reportHarness.queryMock.mock.calls
      .map(([sql]) => String(sql))
      .find(sql => sql.includes("dv.tipo_venta = 'shot'"));
    expect(shotsSql).toBeTruthy();
    expect(shotsSql).toContain('v.estado IN (1, 2)');
    // El rango se arma sobre la fecha de la venta, igual que los demás agregados.
    expect(shotsSql).toContain('DATE(v.fecha_crea) = CURRENT_DATE');
  });
});
