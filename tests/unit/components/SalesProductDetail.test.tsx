import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SalesProductDetail } from '@/components/sales/SalesProductDetail';
afterEach(cleanup);

it.each([
  [{ unidades: 3 }, '6 unidades'],
  [{ ml_por_corto: 150 }, '300 ml']
])('muestra la bebida y consumo de la venta guardada', (consumption, total) => {
  render(
    <SalesProductDetail
      detail={{
        venta_id: 'v',
        producto_id: 'p',
        producto_nombre: 'Whisky',
        categoria_nombre: 'Licores',
        presentacion_nombre: '750 ml',
        tipo_venta: 'shot',
        shot_anfitriona: true,
        precio: 6000,
        sub_total: 12000,
        comision: 2000,
        cantidad: 2,
        anfitrionas: ['Ana', 'Bea'],
        acompanamiento: { presentacion_id: 'sprite', nombre: 'Sprite 350 ml', ...consumption }
      }}
    />
  );
  expect(screen.getByText('Whisky')).toBeInTheDocument();
  expect(screen.getByText('750 ml')).toBeInTheDocument();
  expect(screen.getByText('Licores')).toBeInTheDocument();
  expect(screen.getByText('Anfitrionas: Ana, Bea')).toBeInTheDocument();
  expect(screen.getByText('Sprite 350 ml')).toBeInTheDocument();
  expect(screen.getByText(`Consumo total: ${total}`)).toBeInTheDocument();
  expect(screen.getByText('$12.000')).toBeInTheDocument();
});
