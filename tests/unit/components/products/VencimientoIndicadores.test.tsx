import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VencimientoAlert } from '@/components/products/VencimientoAlert';
import { VencimientoBadge } from '@/components/products/VencimientoBadge';

// Hoy fijo: 2026-10-23 12:00 en la zona del negocio (America/Santiago).
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-23T15:00:00.000Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('VencimientoBadge', () => {
  it('muestra la fecha y marca el lote vencido', () => {
    render(<VencimientoBadge fecha='2026-10-20' />);

    expect(screen.getByText('20-10-2026')).toBeInTheDocument();
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByTitle('Vencido hace 3 días')).toBeInTheDocument();
  });

  it('avisa la cantidad de días cuando está por vencer', () => {
    render(<VencimientoBadge fecha='2026-11-02' />);

    expect(screen.getByText('02-11-2026')).toBeInTheDocument();
    expect(screen.getByText('Vence en 10 d')).toBeInTheDocument();
  });

  it('marca el mismo día del vencimiento como "vence hoy"', () => {
    render(<VencimientoBadge fecha='2026-10-23' />);

    expect(screen.getByText('Vence hoy')).toBeInTheDocument();
  });

  it('muestra solo la fecha cuando el lote todavía está vigente', () => {
    render(<VencimientoBadge fecha='2027-06-30' />);

    expect(screen.getByText('30-06-2027')).toBeInTheDocument();
    expect(screen.queryByText(/Vence en/)).not.toBeInTheDocument();
  });

  it('no renderiza nada si el producto no tiene fecha', () => {
    const { container } = render(<VencimientoBadge fecha={null} />);

    expect(container).toBeEmptyDOMElement();
  });
});

describe('VencimientoAlert', () => {
  it('resume los lotes vencidos y por vencer del listado', () => {
    render(<VencimientoAlert fechas={['2026-10-01', '2026-11-05', '2027-06-30']} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '1 producto con lote vencido y 1 producto por vencer en los próximos 30 días.'
    );
  });

  it('usa el plural con varios lotes vencidos', () => {
    render(<VencimientoAlert fechas={['2026-10-01', '2026-10-20']} />);

    expect(screen.getByRole('alert')).toHaveTextContent('2 productos con lote vencido.');
  });

  it('avisa solo por vencer cuando no hay vencidos', () => {
    render(<VencimientoAlert fechas={['2026-11-01']} />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      '1 producto por vencer en los próximos 30 días.'
    );
  });

  it('no muestra nada sin lotes en riesgo', () => {
    const { container } = render(<VencimientoAlert fechas={['2027-06-30', null, undefined, '']} />);

    expect(container).toBeEmptyDOMElement();
  });
});
