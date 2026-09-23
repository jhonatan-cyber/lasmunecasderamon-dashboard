import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import BarmanDashboard from '@/components/bar/BarmanDashboard';

vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => children
}));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('dashboard del Barman', () => {
  it('muestra existencias y pendientes reales con acceso a recepciones', async () => {
    const request = vi.fn(async (url: string) => ({
      ok: true,
      json: async () => ({
        success: true,
        data:
          url === '/api/bar'
            ? [
                { id: 'p1', producto_nombre: 'Whisky', nombre: '750 ml', stock_bar: 7 },
                { id: 'p2', producto_nombre: 'Ron', nombre: '1 litro', stock_bar: 0 }
              ]
            : [
                {
                  id: 't1',
                  producto_nombre: 'Ron',
                  presentacion_nombre: '1 litro',
                  cantidad: 4,
                  usuario_nombre: 'Almacenero',
                  fecha_crea: '2026-09-21 10:00:00'
                }
              ]
      })
    }));
    vi.stubGlobal('fetch', request);
    render(<BarmanDashboard name='Damián' />);
    const summary = await screen.findByRole('region', { name: 'Resumen de barra' });
    expect(within(summary).getByText('7')).toBeInTheDocument();
    expect(within(summary).getByText('4')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Revisar recepciones (1)' })).toHaveAttribute(
      'href',
      '/bar?tab=pendientes'
    );
    expect(screen.getByText('1 litro · Enviado por Almacenero')).toBeInTheDocument();
    expect(request.mock.calls.map(([url]) => url).sort()).toEqual([
      '/api/bar',
      '/api/transfers/pending'
    ]);
  });

  it('muestra el estado vacío sin inventar movimientos', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, data: [] }) })
    );
    render(<BarmanDashboard name='Damián' />);
    expect(
      await screen.findByText('Todo al día. No hay transferencias pendientes.')
    ).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Revisar recepciones/ })).not.toBeInTheDocument();
  });

  it('muestra un error en vez de presentar ceros como datos válidos', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: false,
          json: async () => ({ success: false, message: 'Permisos insuficientes' })
        })
    );
    render(<BarmanDashboard name='Damián' />);
    expect(await screen.findByText('Permisos insuficientes')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resumen de barra' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});
