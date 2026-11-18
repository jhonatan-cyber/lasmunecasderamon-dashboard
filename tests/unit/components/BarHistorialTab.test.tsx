import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BarHistorialTab, type Movimiento } from '@/components/bar/BarHistorialTab';

vi.mock('boneyard-js/react', () => ({ Skeleton: ({ children }: any) => children }));
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfig: () => 50 }));
afterEach(cleanup);

const movimiento = (overrides: Partial<Movimiento>): Movimiento => ({
  id: 'm1',
  tipo: 'traspaso',
  estado: 'aceptada',
  producto_id: 'p1',
  producto_nombre: 'Johnnie Walker',
  presentacion_nombre: 'Botella 750 ml',
  cantidad: 1,
  precio_venta: 0,
  comision: 0,
  fecha_crea: '2026-11-18T12:00:00',
  usuario_nombre: 'Jefa de barra',
  usuario_apellido: null,
  usuario_nick: null,
  categoria_nombre: 'Whisky',
  ...overrides
});

const renderTabla = (movimientos: Movimiento[]) =>
  render(
    <BarHistorialTab
      movementsError={false}
      onRetry={() => {}}
      loading={false}
      movimientos={movimientos}
      hayFiltro={false}
      meta={null}
      page={1}
      onPageChange={() => {}}
    />
  );

const filaDe = (producto: string) => screen.getByText(producto).closest('tr') as HTMLElement;

describe('BarHistorialTab precios del historial', () => {
  it('muestra ambos precios y la comisión configurada', () => {
    renderTabla([
      movimiento({
        opciones_venta: [
          { tipo: 'botella', precio: 30000, comision: 5000, precio_sin_anfitriona: 18000 }
        ]
      })
    ]);

    const fila = filaDe('Johnnie Walker');
    expect(within(fila).getAllByText('Con anfitriona').length).toBeGreaterThan(0);
    expect(within(fila).getByText('$30.000')).toBeInTheDocument();
    expect(within(fila).getAllByText('Botella sin anfitriona').length).toBeGreaterThan(0);
    expect(within(fila).getAllByText('$18.000').length).toBeGreaterThan(0);
    expect(within(fila).getByText('$5.000')).toBeInTheDocument();
    expect(fila).not.toHaveTextContent('$0');
  });

  it('sin venta con anfitriona solo muestra la botella sin anfitriona', () => {
    renderTabla([
      movimiento({
        precio_venta: 18000,
        opciones_venta: [
          {
            tipo: 'botella',
            precio: 0,
            comision: 0,
            precio_sin_anfitriona: 18000,
            vender_con_anfitriona: false
          }
        ]
      })
    ]);

    const fila = filaDe('Johnnie Walker');
    expect(within(fila).queryByText('Con anfitriona')).toBeNull();
    expect(within(fila).getAllByText('Botella sin anfitriona').length).toBeGreaterThan(0);
    expect(within(fila).getAllByText('$18.000').length).toBeGreaterThan(0);
    expect(fila).not.toHaveTextContent('$0');
  });

  it('una venta sin opciones conserva el precio del movimiento y deja la comisión en cero vacía', () => {
    renderTabla([
      movimiento({ tipo: 'venta', opciones_venta: undefined, precio_venta: 9000, comision: 0 })
    ]);

    const fila = filaDe('Johnnie Walker');
    expect(within(fila).getByText('$9.000')).toBeInTheDocument();
    expect(within(fila).getAllByText('—').length).toBeGreaterThan(0);
    expect(fila).not.toHaveTextContent('$0');
  });
});
