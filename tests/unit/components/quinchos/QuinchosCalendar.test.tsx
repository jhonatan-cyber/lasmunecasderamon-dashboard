import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QuinchosCalendar, agruparReservasPorFecha } from '@/components/quinchos/QuinchosCalendar';
import { formatLongDateEs, getTodayDateKey } from '@/lib/utils/calendarUtils';
import type { ReservaQuincho } from '@/types/quincho';

const hoy = getTodayDateKey();
const periodo = hoy.slice(0, 7);
const fechaConReserva = `${periodo}-15`;
const ultimoDiaDelMes = new Date(
  Number(periodo.slice(0, 4)),
  Number(periodo.slice(5, 7)),
  0
).getDate();
const fechaLibre = `${periodo}-${String(ultimoDiaDelMes).padStart(2, '0')}`;

function reserva(overrides: Partial<ReservaQuincho> = {}): ReservaQuincho {
  return {
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
    observaciones: null,
    estado: 'activa',
    usuario_id: null,
    fecha_crea: '2026-10-01T10:00:00.000Z',
    fecha_anulacion: null,
    anulada_por: null,
    ...overrides
  };
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const dia = (fecha: string) =>
  screen.getByRole('button', { name: new RegExp(formatLongDateEs(fecha)) });

const resumen = () => within(screen.getByRole('region', { name: 'Resumen del mes' }));
const desglose = () => within(screen.getByRole('list', { name: 'Desglose por método de pago' }));

describe('agruparReservasPorFecha', () => {
  it('agrupa por la fecha de la reserva', () => {
    const agrupadas = agruparReservasPorFecha([reserva(), reserva({ id: 'r-2' })]);

    expect(agrupadas.get(fechaConReserva)).toHaveLength(2);
  });
});

describe('QuinchosCalendar', () => {
  it('muestra el cliente y el total del día con reserva', () => {
    render(<QuinchosCalendar reservas={[reserva()]} isLoading={false} onSelectDay={vi.fn()} />);

    const celda = within(dia(fechaConReserva));
    expect(celda.getByText(/Ana Pérez/)).toBeInTheDocument();
    expect(celda.getByText('$50.000')).toBeInTheDocument();
  });

  it('avisa la fecha elegida al tocar un día libre', () => {
    const onSelectDay = vi.fn();
    render(<QuinchosCalendar reservas={[reserva()]} isLoading={false} onSelectDay={onSelectDay} />);

    fireEvent.click(dia(fechaLibre));

    expect(onSelectDay).toHaveBeenCalledWith(fechaLibre, []);
  });

  it('no abre el registro en un día pasado sin reservas', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T15:00:00.000Z'));
    const hoyMock = getTodayDateKey();
    const [anio, mes, diaDelMes] = hoyMock.split('-').map(Number);
    const fechaPasada = `${anio}-${String(mes).padStart(2, '0')}-${String(diaDelMes - 1).padStart(2, '0')}`;
    const onSelectDay = vi.fn();

    render(<QuinchosCalendar reservas={[]} isLoading={false} onSelectDay={onSelectDay} />);
    fireEvent.click(dia(fechaPasada));

    expect(dia(fechaPasada)).toBeDisabled();
    expect(onSelectDay).not.toHaveBeenCalled();
  });

  it('entrega las reservas del día al tocar un día ocupado', () => {
    const onSelectDay = vi.fn();
    const delDia = [reserva(), reserva({ id: 'r-2', estado: 'anulada' })];
    render(<QuinchosCalendar reservas={delDia} isLoading={false} onSelectDay={onSelectDay} />);

    fireEvent.click(dia(fechaConReserva));

    expect(onSelectDay).toHaveBeenCalledWith(fechaConReserva, delDia);
  });

  it('resume reservas, personas y recaudación del mes visible', () => {
    render(
      <QuinchosCalendar
        reservas={[
          reserva(),
          reserva({
            id: 'r-2',
            cantidad_personas: 4,
            total: 20000,
            metodo_pago: 'transferencia'
          })
        ]}
        isLoading={false}
        onSelectDay={vi.fn()}
      />
    );

    expect(resumen().getByText('2')).toBeInTheDocument();
    expect(resumen().getByText('14')).toBeInTheDocument();
    expect(resumen().getByText('$70.000')).toBeInTheDocument();
    expect(desglose().getByText('$50.000')).toBeInTheDocument();
    expect(desglose().getByText('$20.000')).toBeInTheDocument();
    expect(desglose().getByText('$0')).toBeInTheDocument();
  });

  it('deja fuera del resumen las reservas anuladas', () => {
    render(
      <QuinchosCalendar
        reservas={[reserva(), reserva({ id: 'r-2', estado: 'anulada', total: 90000 })]}
        isLoading={false}
        onSelectDay={vi.fn()}
      />
    );

    expect(resumen().getByText('1')).toBeInTheDocument();
    expect(resumen().getByText('10')).toBeInTheDocument();
    expect(desglose().getByText('$50.000')).toBeInTheDocument();
    expect(desglose().queryByText('$90.000')).not.toBeInTheDocument();
  });

  it('el resumen sigue al mes que se muestra', () => {
    render(<QuinchosCalendar reservas={[reserva()]} isLoading={false} onSelectDay={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Mes siguiente' }));

    expect(resumen().getAllByText('0')).toHaveLength(2);
    expect(desglose().getAllByText('$0')).toHaveLength(3);
  });

  it('no cuenta las reservas anuladas como activas al anunciar el día', () => {
    render(
      <QuinchosCalendar
        reservas={[reserva({ estado: 'anulada' })]}
        isLoading={false}
        onSelectDay={vi.fn()}
      />
    );

    expect(dia(fechaConReserva)).toHaveAccessibleName(/solo reservas anuladas/);
  });

  it('permite abrir el detalle de un día pasado que solo tiene reservas anuladas', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-23T15:00:00.000Z'));
    const [anio, mes, diaDelMes] = getTodayDateKey().split('-').map(Number);
    const ayer = new Date(anio, mes - 1, diaDelMes - 1);
    const fechaPasada = `${ayer.getFullYear()}-${String(ayer.getMonth() + 1).padStart(2, '0')}-${String(ayer.getDate()).padStart(2, '0')}`;
    const anulada = reserva({ fecha_reserva: fechaPasada, estado: 'anulada' });
    const onSelectDay = vi.fn();

    render(<QuinchosCalendar reservas={[anulada]} isLoading={false} onSelectDay={onSelectDay} />);
    fireEvent.click(dia(fechaPasada));

    expect(dia(fechaPasada)).not.toBeDisabled();
    expect(onSelectDay).toHaveBeenCalledWith(fechaPasada, [anulada]);
  });
});
