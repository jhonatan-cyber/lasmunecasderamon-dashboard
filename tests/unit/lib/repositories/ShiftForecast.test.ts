import { describe, expect, it } from 'vitest';
import { buildShiftForecast } from '@/modules/reportes/dashboard/forecast';

describe('proyección por turno de caja', () => {
  it('avisa de cajas abiertas más de 24 horas y suspende la estimación', () => {
    const forecast = buildShiftForecast({
      caja_id: 'c1',
      elapsed_minutes: 15000,
      history_count: 5,
      expected_minutes: 480
    });
    expect(forecast.projectedRevenue).toBeNull();
    expect(forecast.anomalies[0].id).toBe('stale-caja');
  });
  it('no inventa una proyección sin caja abierta', () => {
    expect(buildShiftForecast()).toMatchObject({ status: 'closed', projectedRevenue: null });
  });
  it('requiere historial y tiempo suficiente de operación', () => {
    expect(
      buildShiftForecast({
        caja_id: 'c1',
        elapsed_minutes: 20,
        history_count: 5,
        expected_minutes: 480
      }).status
    ).toBe('insufficient');
    expect(
      buildShiftForecast({
        caja_id: 'c1',
        elapsed_minutes: 120,
        history_count: 2,
        expected_minutes: 480
      }).projectedRevenue
    ).toBeNull();
  });
  it('proyecta un turno nocturno por minutos desde la apertura, sin reiniciarse a medianoche', () => {
    expect(
      buildShiftForecast({
        caja_id: 'c1',
        elapsed_minutes: 240,
        history_count: 5,
        expected_minutes: 480,
        current_revenue: '100000',
        previous_revenue: '180000'
      })
    ).toMatchObject({
      status: 'ready',
      projectedRevenue: 200000,
      currentRevenue: 100000,
      yesterdayRevenue: 180000
    });
  });
  it('no proyecta menos de lo vendido si el turno supera la duración histórica', () => {
    expect(
      buildShiftForecast({
        caja_id: 'c1',
        elapsed_minutes: 600,
        history_count: 5,
        expected_minutes: 480,
        current_revenue: 100000
      }).projectedRevenue
    ).toBe(100000);
  });
});
