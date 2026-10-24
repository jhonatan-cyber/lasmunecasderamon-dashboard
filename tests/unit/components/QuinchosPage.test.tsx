import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import QuinchosPage from '@/app/quinchos/page';
import { formatLongDateEs, getTodayDateKey } from '@/lib/utils/calendarUtils';
import type { ReservaQuincho } from '@/types/quincho';

const periodo = getTodayDateKey().slice(0, 7);
const fechaConReserva = `${periodo}-15`;
const fechaLibre = `${periodo}-16`;

const reservaDelDia: ReservaQuincho = {
  id: 'r-1',
  cliente_id: 'c-1',
  cliente_nombre: 'Ana',
  cliente_apellido: 'Pérez',
  cliente_run: '12.345.678-9',
  fecha_reserva: fechaConReserva,
  cantidad_personas: 10,
  monto_por_persona: 5000,
  total: 50000,
  metodo_pago: 'efectivo',
  observaciones: 'Cumpleaños',
  estado: 'activa',
  usuario_id: null,
  fecha_crea: '2026-10-01T10:00:00.000Z',
  fecha_anulacion: null,
  anulada_por: null
};

vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));
vi.mock('@/components/sales/CajaStatusBanner', () => ({ CajaStatusBanner: () => null }));
vi.mock('@/hooks/cash-register/useCashRegisterStatus', () => ({
  useCashRegisterStatus: () => ({ hasOpenCaja: true, loading: false })
}));
vi.mock('@/hooks/auth/useUserPermissions', () => ({
  useUserPermissions: () => ({ hasPermission: () => true, isLoading: false })
}));
const { anularReserva } = vi.hoisted(() => ({ anularReserva: vi.fn() }));

vi.mock('@/hooks/quinchos/useQuinchos', () => ({
  useQuinchos: () => ({
    reservas: [reservaDelDia],
    clientes: [],
    isLoading: false,
    isSaving: false,
    isCancelling: false,
    crearReserva: vi.fn().mockResolvedValue(true),
    anularReserva
  })
}));

afterEach(() => {
  cleanup();
  anularReserva.mockReset();
  anularReserva.mockResolvedValue(true);
});

const dia = (fecha: string) =>
  screen.getByRole('button', { name: new RegExp(formatLongDateEs(fecha)) });

describe('página de reservas de quincho', () => {
  it('abre el registro con la fecha del día libre elegido', () => {
    render(<QuinchosPage />);

    fireEvent.click(dia(fechaLibre));

    expect(screen.getByRole('heading', { name: /Nueva reserva de quincho/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Fecha de reserva')).toHaveValue(fechaLibre);
  });

  it('muestra el detalle en vez del registro cuando el día ya tiene reserva', () => {
    render(<QuinchosPage />);

    fireEvent.click(dia(fechaConReserva));

    const detalle = within(screen.getByRole('dialog'));
    expect(screen.getByRole('heading', { name: /Reservas del quincho/i })).toBeInTheDocument();
    expect(detalle.getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(detalle.getByText('$50.000')).toBeInTheDocument();
    expect(screen.queryByLabelText('Fecha de reserva')).not.toBeInTheDocument();
  });

  it('anula la reserva desde el detalle del día', async () => {
    render(<QuinchosPage />);

    fireEvent.click(dia(fechaConReserva));
    fireEvent.click(screen.getByRole('button', { name: /Anular reserva de Ana Pérez/i }));
    fireEvent.click(screen.getByRole('button', { name: /Anular y devolver/i }));

    await waitFor(() => expect(anularReserva).toHaveBeenCalledWith(reservaDelDia));
  });

  it('muestra solo el calendario, sin botón de nueva reserva ni pestañas', () => {
    render(<QuinchosPage />);

    expect(screen.queryByRole('button', { name: /Nueva reserva/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Listado/i })).not.toBeInTheDocument();
    expect(dia(fechaConReserva)).toBeInTheDocument();
  });
});
