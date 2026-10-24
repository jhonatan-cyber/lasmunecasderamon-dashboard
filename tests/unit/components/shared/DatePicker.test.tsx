import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DatePicker } from '@/components/shared/DatePicker';

afterEach(() => {
  cleanup();
});

const abrirCalendario = () => {
  fireEvent.click(screen.getByRole('button', { name: /^Fecha de prueba/i }));
};

describe('DatePicker', () => {
  it('deshabilita los días anteriores a la fecha mínima', () => {
    render(
      <DatePicker
        value='2026-12-24'
        minDate='2026-12-24'
        ariaLabel='Fecha de prueba'
        onChange={() => {}}
      />
    );
    abrirCalendario();

    expect(document.querySelector('[data-day="2026-12-23"] button')).toBeDisabled();
    expect(document.querySelector('[data-day="2026-12-24"] button')).not.toBeDisabled();
  });

  it('deshabilita los días posteriores a la fecha máxima', () => {
    render(
      <DatePicker
        value='2026-12-24'
        maxDate='2026-12-24'
        ariaLabel='Fecha de prueba'
        onChange={() => {}}
      />
    );
    abrirCalendario();

    expect(document.querySelector('[data-day="2026-12-24"] button')).not.toBeDisabled();
    expect(document.querySelector('[data-day="2026-12-25"] button')).toBeDisabled();
  });

  it('no selecciona una fecha anterior a la mínima', () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        value='2026-12-24'
        minDate='2026-12-24'
        ariaLabel='Fecha de prueba'
        onChange={onChange}
      />
    );
    abrirCalendario();

    fireEvent.click(document.querySelector('[data-day="2026-12-23"] button')!);

    expect(onChange).not.toHaveBeenCalled();
  });

  it('entrega la fecha elegida en formato ISO', () => {
    const onChange = vi.fn();
    render(
      <DatePicker
        value='2026-12-24'
        minDate='2026-12-24'
        ariaLabel='Fecha de prueba'
        onChange={onChange}
      />
    );
    abrirCalendario();

    fireEvent.click(document.querySelector('[data-day="2026-12-31"] button')!);

    expect(onChange).toHaveBeenCalledWith('2026-12-31');
  });

  it('muestra la fecha en formato compacto cuando se pide', () => {
    render(
      <DatePicker
        value='2026-12-24'
        displayFormat='short'
        ariaLabel='Fecha de prueba'
        onChange={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /^Fecha de prueba/i })).toHaveTextContent(
      '24/12/2026'
    );
  });
});
