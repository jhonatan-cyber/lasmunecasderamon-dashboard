import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ReservaQuinchoDetalleModal } from '@/components/quinchos/ReservaQuinchoDetalleModal';
import type { ReservaQuincho } from '@/types/quincho';

const reserva: ReservaQuincho = {
  id: 'r-1',
  cliente_id: 'c-1',
  cliente_nombre: 'Ana',
  cliente_apellido: 'Pérez',
  cliente_run: '12.345.678-9',
  fecha_reserva: '2026-11-20',
  cantidad_personas: 10,
  monto_por_persona: 5000,
  total: 50000,
  metodo_pago: 'transferencia',
  observaciones: 'Cumpleaños, requiere mesas extra',
  estado: 'activa',
  usuario_id: null,
  fecha_crea: '2026-10-01T10:00:00.000Z',
  fecha_anulacion: null,
  anulada_por: null
};

afterEach(() => {
  cleanup();
});

const mount = (props: Partial<React.ComponentProps<typeof ReservaQuinchoDetalleModal>> = {}) => {
  const onCancel = vi.fn().mockResolvedValue(true);
  render(
    <ReservaQuinchoDetalleModal
      open
      onOpenChange={() => {}}
      fecha='2026-11-20'
      reservas={[reserva]}
      canCancel
      isCancelling={false}
      onCancel={onCancel}
      {...props}
    />
  );
  return onCancel;
};

describe('ReservaQuinchoDetalleModal', () => {
  it('muestra los datos de la reserva del día', () => {
    mount();

    expect(screen.getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(screen.getByText('12.345.678-9')).toBeInTheDocument();
    expect(screen.getByText('$50.000')).toBeInTheDocument();
    expect(screen.getByText('$5.000')).toBeInTheDocument();
    expect(screen.getByText('transferencia')).toBeInTheDocument();
    expect(screen.getByText('Cumpleaños, requiere mesas extra')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
  });

  it('avisa cuando el día no tiene reservas', () => {
    mount({ fecha: '2026-11-21', reservas: [] });

    expect(screen.getByText('No hay reservas registradas para esta fecha.')).toBeInTheDocument();
  });

  it('marca las reservas anuladas con su fecha de anulación', () => {
    mount({
      reservas: [{ ...reserva, estado: 'anulada', fecha_anulacion: '2026-10-05T12:00:00.000Z' }]
    });

    expect(screen.getByText('Anulada')).toBeInTheDocument();
    expect(screen.getByText(/Anulada el/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Anular reserva de/i })).not.toBeInTheDocument();
  });

  it('oculta la anulación sin el permiso de anular', () => {
    mount({ canCancel: false });

    expect(screen.queryByRole('button', { name: /Anular reserva de/i })).not.toBeInTheDocument();
  });

  it('anula solo después de confirmar y devolviendo el prepago', async () => {
    const onCancel = mount();

    fireEvent.click(screen.getByRole('button', { name: /Anular reserva de Ana Pérez/i }));
    expect(screen.getByRole('heading', { name: /Anular reserva/i })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Anular y devolver/i }));

    await waitFor(() => expect(onCancel).toHaveBeenCalledWith(reserva));
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: /Anular reserva/i })).not.toBeInTheDocument()
    );
  });

  it('mantiene la confirmación abierta si la anulación falla', async () => {
    mount({ onCancel: vi.fn().mockResolvedValue(false) });

    fireEvent.click(screen.getByRole('button', { name: /Anular reserva de Ana Pérez/i }));
    fireEvent.click(screen.getByRole('button', { name: /Anular y devolver/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Anular reserva/i })).toBeInTheDocument()
    );
  });
});
