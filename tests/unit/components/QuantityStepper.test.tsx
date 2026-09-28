'use client';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QuantityStepper } from '@/components/shared/QuantityStepper';

vi.mock('sonner', () => ({ toast: { warning: vi.fn() } }));

import { toast } from 'sonner';

afterEach(cleanup);
beforeEach(() => vi.mocked(toast.warning).mockClear());

// El contador vive fuera del selector (cada pantalla guarda su cantidad), así que el
// helper lo controla para reproducir el ciclo subir/bajar.
const renderStepper = ({
  inicial = 1,
  max = 5,
  children
}: {
  inicial?: number;
  max?: number;
  children?: React.ReactNode;
} = {}) => {
  const onChange = vi.fn();
  const Harness = () => {
    const [value, setValue] = useState(inicial);
    return (
      <QuantityStepper
        value={value}
        max={max}
        onChange={next => {
          onChange(next);
          setValue(next);
        }}
      >
        {children}
      </QuantityStepper>
    );
  };
  render(<Harness />);
  return { onChange };
};

const aumentar = () => screen.getByRole('button', { name: 'Aumentar' });
const disminuir = () => screen.getByRole('button', { name: 'Disminuir' });

describe('selector de cantidad compartido', () => {
  it('sube y baja la cantidad y no deja bajar de una unidad', () => {
    const { onChange } = renderStepper();

    expect(disminuir()).toBeDisabled();
    fireEvent.click(aumentar());
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(screen.getByText('2')).toBeInTheDocument();

    fireEvent.click(disminuir());
    expect(onChange).toHaveBeenLastCalledWith(1);
    expect(disminuir()).toBeDisabled();
  });

  it('en el tope queda apagado, avisa y no cambia la cantidad', () => {
    const { onChange } = renderStepper({ inicial: 5, max: 5 });

    expect(aumentar()).toHaveAttribute('aria-disabled', 'true');
    fireEvent.click(aumentar());

    // Mismo aviso que el carro del dashboard ante un tope de stock.
    expect(toast.warning).toHaveBeenLastCalledWith('Stock máximo en bar: 5');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('no avisa mientras quede margen', () => {
    const { onChange } = renderStepper({ inicial: 4, max: 5 });

    expect(aumentar()).toHaveAttribute('aria-disabled', 'false');
    fireEvent.click(aumentar());

    expect(toast.warning).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith(5);
  });

  it('deja que cada pantalla ponga su propia línea bajo el contador', () => {
    renderStepper({ children: <span>Disponibles en bar: 5</span> });

    expect(screen.getByText('Disponibles en bar: 5')).toBeInTheDocument();
  });
});
