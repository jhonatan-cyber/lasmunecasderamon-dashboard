import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryHarness = vi.hoisted(() => ({ queryMock: vi.fn() }));

vi.mock('@/lib/database/db', () => ({
  query: repositoryHarness.queryMock,
  withTransaction: vi.fn()
}));

import { VentasStatsRepository } from '@/modules/reportes/ventas/repositorio';

describe('VentasStatsRepository · shots del cierre de caja', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devuelve ceros cuando la caja no vendió shots', async () => {
    repositoryHarness.queryMock.mockResolvedValue([]);

    await expect(VentasStatsRepository.getShotsVendidos('caja-1')).resolves.toEqual({
      cliente: { monto: 0, cantidad: 0 },
      anfitriona: { monto: 0, cantidad: 0 }
    });
  });

  it('parte los shots por precio de cliente y de anfitriona', async () => {
    repositoryHarness.queryMock.mockResolvedValue([
      {
        cliente_monto: 10000,
        cliente_cantidad: 2,
        anfitriona_monto: 6000,
        anfitriona_cantidad: 2
      }
    ]);

    const shots = await VentasStatsRepository.getShotsVendidos('caja-1');

    expect(shots).toEqual({
      cliente: { monto: 10000, cantidad: 2 },
      anfitriona: { monto: 6000, cantidad: 2 }
    });
    // Solo cuentan los detalles marcados como shot: sin eso el desglose sería basura.
    const [sql] = repositoryHarness.queryMock.mock.calls[0];
    expect(String(sql)).toContain("dv.tipo_venta = 'shot'");
    expect(String(sql)).toContain('dv.shot_anfitriona');
  });

  it('adjunta el desglose a las ventas de barra sin alterar sus totales', async () => {
    repositoryHarness.queryMock.mockImplementation(async (sql: string) => {
      if (String(sql).includes('cliente_monto')) {
        return [
          {
            cliente_monto: 10000,
            cliente_cantidad: 2,
            anfitriona_monto: 6000,
            anfitriona_cantidad: 2
          }
        ];
      }
      return [{ total_venta: 50000, cargo_tarjeta: 0, propinas: 1000, monto_productos: 40000 }];
    });

    const barras = await VentasStatsRepository.getVentasBarras('caja-1');

    expect(barras.shots_cliente).toEqual({ monto: 10000, cantidad: 2 });
    expect(barras.shots_anfitriona).toEqual({ monto: 6000, cantidad: 2 });
    // Corte transversal: su monto ya está dentro de las bolsas de la caja.
    expect(barras.total_venta).toBe(50000);
    expect(barras.monto_productos).toBe(40000);
  });
});
