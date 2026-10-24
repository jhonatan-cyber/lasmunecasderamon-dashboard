import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReservaQuinchoModal } from '@/components/quinchos/ReservaQuinchoModal';
import type { Client } from '@/types/client';

const cliente: Client = {
  id: 'c-1',
  run: '12.345.678-9',
  name: 'Ana',
  lastName: 'Pérez',
  phone: '+56 9 1111 1111',
  saldo: 7000
};

afterEach(() => {
  cleanup();
});

const mount = (
  onSubmit = vi.fn().mockResolvedValue(true),
  props: Partial<React.ComponentProps<typeof ReservaQuinchoModal>> = {}
) => {
  render(
    <ReservaQuinchoModal
      open
      onOpenChange={() => {}}
      clientes={[cliente]}
      cajaCerrada={false}
      isSaving={false}
      onSubmit={onSubmit}
      {...props}
    />
  );
  return onSubmit;
};

const completarDatos = () => {
  fireEvent.change(screen.getByLabelText('Cantidad de personas'), { target: { value: '10' } });
  fireEvent.change(screen.getByLabelText('Monto por persona'), { target: { value: '5000' } });
};

const enviar = () => fireEvent.submit(document.getElementById('reserva-quincho-form')!);

describe('ReservaQuinchoModal', () => {
  it('calcula el total con personas × monto por persona', () => {
    mount();
    completarDatos();

    expect(screen.getByText('$50.000')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Cantidad de personas'), { target: { value: '3' } });
    expect(screen.getByText('$15.000')).toBeInTheDocument();
  });

  it('envía la reserva con un cliente nuevo y sin cliente_id', async () => {
    const onSubmit = mount();

    fireEvent.click(screen.getByRole('button', { name: /Nuevo/i }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Bruno' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Díaz' } });
    fireEvent.change(screen.getByLabelText('RUN (opcional)'), {
      target: { value: '9.876.543-2' }
    });
    completarDatos();
    enviar();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cliente_id: null,
      cliente_nuevo: { name: 'Bruno', lastName: 'Díaz', run: '9.876.543-2' },
      fecha_reserva: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      cantidad_personas: 10,
      monto_por_persona: 5000,
      metodo_pago: 'efectivo'
    });
  });

  it('capitaliza en tiempo real nombre, apellido y observaciones', async () => {
    const onSubmit = mount();

    fireEvent.click(screen.getByRole('button', { name: /Nuevo/i }));
    const nombre = screen.getByLabelText('Nombre');
    const apellido = screen.getByLabelText('Apellido');
    const observaciones = screen.getByLabelText('Observaciones (opcional)');

    fireEvent.change(nombre, { target: { value: 'bruno alejandro' } });
    fireEvent.change(apellido, { target: { value: 'díaz muñoz' } });
    fireEvent.change(observaciones, { target: { value: 'cumpleaños, requiere mesas extra' } });

    expect(nombre).toHaveValue('Bruno Alejandro');
    expect(apellido).toHaveValue('Díaz Muñoz');
    expect(observaciones).toHaveValue('Cumpleaños, requiere mesas extra');

    fireEvent.change(nombre, { target: { value: 'bruno ' } });
    expect(nombre).toHaveValue('Bruno ');

    completarDatos();
    enviar();

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      cliente_nuevo: { name: 'Bruno', lastName: 'Díaz Muñoz' },
      observaciones: 'Cumpleaños, requiere mesas extra'
    });
  });

  it('precarga la fecha del día elegido en el calendario', () => {
    mount(vi.fn().mockResolvedValue(true), { fechaInicial: '2026-12-24' });

    expect(screen.getByLabelText('Fecha de reserva')).toHaveValue('2026-12-24');
  });

  it('pide elegir un cliente antes de guardar', () => {
    const onSubmit = mount();
    completarDatos();
    enviar();

    expect(screen.getByRole('alert')).toHaveTextContent('Selecciona un cliente o crea uno nuevo');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('no permite guardar con la caja cerrada', () => {
    const onSubmit = mount(vi.fn().mockResolvedValue(true), { cajaCerrada: true });
    completarDatos();

    expect(screen.getByRole('button', { name: /Registrar reserva/i })).toBeDisabled();
    expect(screen.getByText(/La caja está cerrada/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('rechaza una cantidad de personas inválida', () => {
    const onSubmit = mount();
    fireEvent.change(screen.getByLabelText('Monto por persona'), { target: { value: '5000' } });
    fireEvent.change(screen.getByLabelText('Cantidad de personas'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /Nuevo/i }));
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Bruno' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'Díaz' } });
    enviar();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'La cantidad de personas debe ser al menos 1'
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
