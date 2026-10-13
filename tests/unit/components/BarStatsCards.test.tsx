import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { BarStatsCards } from '@/components/bar/BarStatsCards';

afterEach(cleanup);

it('abre el detalle de ml disponibles por cada botella', async () => {
  render(
    <BarStatsCards
      resumen={{
        shotMl: 50,
        shotsAlerta: 3,
        mlServidosHoy: 100,
        shotsServidosHoy: 2,
        mlRestantesTotales: 125,
        botellasAbiertas: 2,
        botellasPorAgotarse: 1
      }}
      botellasAbiertas={[
        {
          id: 'pres-1',
          venta_corto_habilitada: true,
          producto_nombre: 'Paceña',
          presentacion_nombre: '750 ml',
          cantidad: 2,
          ml_disponibles: 125,
          ml_cliente: 50,
          ml_anfitriona: 25,
          shots_anfitriona_disponibles: 5,
          shots_disponibles: 2
        }
      ]}
    />
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Ver las botellas abiertas y sus mililitros disponibles' })
  );

  expect(await screen.findByText('Paceña')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByText('125 ml')).toBeInTheDocument();
  expect(screen.getByText('Cliente · 50 ml')).toBeInTheDocument();
  expect(screen.getByText('Anfitriona · 25 ml')).toBeInTheDocument();
  expect(within(screen.getByRole('dialog')).getByText('5 cortos')).toBeInTheDocument();
  expect(screen.queryByText(/LM-/)).not.toBeInTheDocument();
});
