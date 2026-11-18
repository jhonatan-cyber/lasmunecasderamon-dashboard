import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SalePrices } from '@/components/bar/SalePrices';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfig: () => 50 }));
afterEach(cleanup);

describe('SalePrices en el historial', () => {
  it('muestra la botella con y sin anfitriona con su comisión solo si existe', () => {
    render(
      <SalePrices
        options={[{ tipo: 'botella', precio: 30000, comision: 5000, precio_sin_anfitriona: 18000 }]}
      />
    );

    expect(screen.getByText('Con anfitriona')).toBeInTheDocument();
    expect(screen.getByText('$30.000')).toBeInTheDocument();
    expect(screen.getByText('Comisión: $5.000')).toBeInTheDocument();
    expect(screen.getByText('Botella sin anfitriona')).toBeInTheDocument();
    expect(screen.getByText('$18.000')).toBeInTheDocument();
    expect(screen.getByText('Sin comisión')).toBeInTheDocument();
  });

  it('sin venta con anfitriona solo queda la botella sin anfitriona', () => {
    render(
      <SalePrices
        options={[
          {
            tipo: 'botella',
            precio: 0,
            comision: 0,
            precio_sin_anfitriona: 18000,
            vender_con_anfitriona: false
          }
        ]}
      />
    );

    expect(screen.getByText('Botella sin anfitriona')).toBeInTheDocument();
    expect(screen.queryByText('Con anfitriona')).toBeNull();
    expect(screen.queryByText(/Comisión/)).toBeNull();
  });

  it('sin comisión no deja un punto colgando ni una comisión en cero', () => {
    render(
      <SalePrices
        options={[
          {
            tipo: 'shot',
            precio: 3000,
            comision: 0,
            precios_anfitriona: [
              { precio: 5000, comision: 1000 },
              { precio: 7000, comision: 0 }
            ]
          }
        ]}
      />
    );

    expect(screen.getByText('Anfitriona 1 $5.000 · Comisión $1.000')).toBeInTheDocument();
    expect(screen.getByText('Anfitriona 2 $7.000 · Sin comisión')).toBeInTheDocument();
    expect(screen.queryByText(/\$0/)).toBeNull();
  });

  it('en columnas deja vacía la comisión cuando es cero', () => {
    render(
      <SalePrices
        layout='columns'
        options={[
          { tipo: 'botella', precio: 30000, comision: 5000, precio_sin_anfitriona: 18000 },
          {
            tipo: 'shot',
            precio: 3000,
            comision: 0,
            precios_anfitriona: [{ precio: 5000, comision: 0 }]
          }
        ]}
      />
    );

    expect(screen.getByText('Con anfitriona')).toBeInTheDocument();
    expect(screen.getByText('$30.000')).toBeInTheDocument();
    expect(screen.getAllByText('$5.000').length).toBeGreaterThan(0);
    expect(screen.getByText('Sin anfitriona')).toBeInTheDocument();
    expect(screen.getByText('$18.000')).toBeInTheDocument();
    expect(screen.getByText('Anfitriona 1')).toBeInTheDocument();
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });
});
