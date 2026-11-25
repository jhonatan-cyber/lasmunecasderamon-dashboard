import type { ReactNode } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';

const mocks = vi.hoisted(() => ({ role: 'admin', replace: vi.fn() }));

vi.mock('@/hooks/auth/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: { id: 1, name: 'Usuario de prueba', role: mocks.role },
    loading: false
  })
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock('next/dynamic', () => ({ default: () => () => null }));
vi.mock('boneyard-js/react', () => ({
  Skeleton: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/components/dashboard/CriticalMetrics', () => ({ default: () => <div /> }));
vi.mock('@/components/dashboard/LocalAndPending', () => ({ default: () => <div /> }));
vi.mock('@/components/dashboard/RecentActivityCompact', () => ({ default: () => <div /> }));
vi.mock('@/components/dashboard/TopPerformers', () => ({ default: () => <div /> }));
vi.mock('@/components/dashboard/ForecastInsights', () => ({ default: () => <div /> }));
vi.mock('@/components/dashboard/LoggedUsersCards', () => ({ default: () => <div /> }));
vi.mock('@/components/purchases/ReplenishmentNotice', () => ({
  ReplenishmentNotice: () => <div />
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.role = 'admin';
});
afterEach(cleanup);

function expectBefore(firstTitle: string, secondTitle: string) {
  const first = screen.getByRole('heading', { name: firstTitle });
  const second = screen.getByRole('heading', { name: secondTitle });
  const relation = first.compareDocumentPosition(second);
  expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
}

it('prioriza operación y deja el análisis plegado', () => {
  render(<Dashboard />);

  expectBefore('Métricas Críticas de Operación', 'Operación en Tiempo Real');
  expectBefore('Operación en Tiempo Real', 'Personal en Local (Login Activo)');
  expectBefore('Personal en Local (Login Activo)', 'Tendencias de Venta Diaria');
  expectBefore('Tendencias de Venta Diaria', 'Performance y Forecast');
  const topPerformersToggle = screen.getByRole('button', { name: /Top Performers/ });
  const forecastToggle = screen.getByRole('button', { name: /Proyección Forecast/ });
  expect(topPerformersToggle).toHaveAttribute('aria-expanded', 'false');
  expect(forecastToggle).toHaveAttribute('aria-expanded', 'false');
});

it('prioriza los reportes para cajeros', () => {
  mocks.role = 'cajero';
  render(<Dashboard />);

  expectBefore('Métricas Críticas de Operación', 'Reportes del Cajero');
  expectBefore('Reportes del Cajero', 'Operación en Tiempo Real');
  expectBefore('Reportes del Cajero', 'Tendencias de Venta Diaria');
});
