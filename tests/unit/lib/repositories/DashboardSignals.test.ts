import { describe, expect, it } from 'vitest';
import { buildAnomalies, buildRankings } from '@/modules/reportes/dashboard/calculos';

describe('rankings y señales del dashboard', () => {
  it('separa categorías y limita los resultados a los cinco primeros', () => {
    const rows = Array.from({ length: 7 }, (_, i) => ({
      ranking_type: 'product',
      item_name: `Producto ${i}`,
      primary_value: '2',
      secondary_value: '1000'
    }));
    const rankings = buildRankings([
      ...rows,
      { ranking_type: 'staff', item_name: 'Bar', primary_value: 1, secondary_value: 500 }
    ]);
    expect(rankings.products).toHaveLength(5);
    expect(rankings.products[0]).toMatchObject({ quantity: 2, amount: 1000 });
    expect(rankings.staff).toEqual([{ name: 'Bar', quantity: 1, amount: 500 }]);
    expect(rankings.rooms).toEqual([]);
  });
  it('detecta caída de ventas y presión operativa sin mezclar importes', () => {
    expect(
      buildAnomalies({
        todaySalesSameTime: 70,
        yesterdaySalesSameTime: 100,
        pendingOrders: 5,
        expiringServices: 3
      }).map(x => x.id)
    ).toEqual(['sales-drop', 'order-backlog', 'service-pressure']);
  });
  it('no emite alertas de ventas sin referencia y detecta aumentos con referencia', () => {
    expect(
      buildAnomalies({
        todaySalesSameTime: 100,
        yesterdaySalesSameTime: 0,
        pendingOrders: 0,
        expiringServices: 0
      })
    ).toEqual([]);
    expect(
      buildAnomalies({
        todaySalesSameTime: 125,
        yesterdaySalesSameTime: 100,
        pendingOrders: 0,
        expiringServices: 0
      })[0].id
    ).toBe('sales-boost');
  });
});
