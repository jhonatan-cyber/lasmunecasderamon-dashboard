import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
          id: 'unit-1',
          codigo: 'LM-000001',
          ml_restante: 75,
          producto_nombre: 'Paceña',
          presentacion_nombre: '750 ml'
        },
        {
          id: 'unit-2',
          codigo: 'LM-000002',
          ml_restante: 50,
          producto_nombre: 'Paceña',
          presentacion_nombre: '750 ml'
        }
      ]}
    />
  );

  fireEvent.click(
    screen.getByRole('button', { name: 'Ver las botellas abiertas y sus mililitros disponibles' })
  );

  expect(await screen.findByText(/Código LM-000001/)).toBeInTheDocument();
  expect(screen.getByText('75 ml')).toBeInTheDocument();
  expect(screen.getByText('50 ml')).toBeInTheDocument();
});
