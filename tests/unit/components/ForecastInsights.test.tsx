import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import ForecastInsights from '@/components/dashboard/ForecastInsights';
import { buildShiftForecast } from '@/modules/reportes/dashboard/forecast';

const harness = vi.hoisted(() => ({ result: {} as any }));
vi.mock('@/hooks/stats/useDashboardComposite', () => ({
  useDashboardComposite: () => harness.result
}));
afterEach(cleanup);

function show(row: Record<string, unknown>) {
  harness.result = { data: { insights: { forecast: buildShiftForecast(row) } }, isLoading: false };
  render(<ForecastInsights />);
}

describe('diagnóstico de la proyección', () => {
  it('distingue la caja antigua del historial insuficiente', () => {
    show({ caja_id: 'c1', elapsed_minutes: 1600, history_count: 5, expected_minutes: 480 });
    expect(screen.getByText('La caja lleva más de 24 horas abierta. Revisa el cierre del turno anterior.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Revisar caja' })).toHaveAttribute('href', '/cash-register');
    expect(screen.queryByText(/Hay 5 turnos/)).not.toBeInTheDocument();
  });
  it('indica cuándo puede comenzar la estimación y cuántos turnos faltan', () => {
    show({ caja_id: 'c1', elapsed_minutes: 10, history_count: 2, expected_minutes: 480 });
    expect(screen.getByText(/Hay 2 turnos cerrados válidos/)).toHaveTextContent(/comienza a los 30 minutos/);
  });
  it('permite revisar la caja cuando no hay turno abierto', () => {
    show({});
    expect(screen.getByText('Sin caja abierta')).toBeInTheDocument();
    expect(screen.getByText(/Abre una caja/)).toBeInTheDocument();
  });
});
