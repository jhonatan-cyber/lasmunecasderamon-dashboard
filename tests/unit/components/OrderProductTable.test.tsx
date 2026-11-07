import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import OrderProductTable from '@/components/orders/OrderProductTable';
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));
vi.mock('@/components/sales/product-modal/SaleProductPhoto', () => ({
  SaleProductPhoto: () => null
}));
vi.mock('@/components/orders/HostessMultiSelect', () => ({ default: () => null }));
it('muestra formato y consumo de la bebida del corto configurado', () => {
  render(
    <OrderProductTable
      anfitrionas={[]}
      productos={[
        {
          nombre: 'Ron',
          precio: 10000,
          cantidad: 2,
          subtotal: 20000,
          tipo_venta: 'shot',
          shot_anfitriona: true,
          ml_shot_anfitriona: 20,
          generaComision: 1,
          comision: 4000,
          acompanamiento_corto: {
            presentacion_id: 'sprite',
            nombre: 'Sprite 350 ml',
            ml_por_corto: 150
          }
        }
      ]}
    />
  );
  expect(screen.getByRole('button', { name: 'Corto anfitriona' })).toBeInTheDocument();
  expect(screen.getByText('Sprite 350 ml')).toBeInTheDocument();
  expect(screen.getByText(/150 ml por corto/)).toBeInTheDocument();
  expect(screen.getByText(/Total 300/)).toBeInTheDocument();
  expect(screen.getByText('Trago: 20 ml por corto · 40 ml en total')).toBeInTheDocument();
  expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
});

it('oculta las columnas opcionales cuando ningún producto tiene datos para ellas', () => {
  render(
    <OrderProductTable
      anfitrionas={[]}
      productos={[
        {
          nombre: 'Botella',
          precio: 10000,
          cantidad: 1,
          subtotal: 10000,
          tipo_venta: 'botella',
          generaComision: 0,
          comision: 0,
          selectedHostesses: [],
          selectedRoom: null,
          acompanamiento_botella: []
        }
      ]}
    />
  );

  expect(screen.queryByRole('columnheader')).not.toBeInTheDocument();
  expect(screen.getAllByText('Botella').length).toBeGreaterThan(0);
});

it('conserva habitación cuando algún producto la requiere aunque aún no esté asignada', () => {
  render(
    <OrderProductTable
      anfitrionas={[]}
      productos={[
        {
          nombre: 'Botella',
          precio: 10000,
          cantidad: 1,
          subtotal: 10000,
          tipo_venta: 'botella',
          generaComision: 0,
          comision: 0,
          requiresRoom: true
        }
      ]}
    />
  );

  expect(screen.getByText('Habitación')).toBeInTheDocument();
});

it('usa la tabla cuando el ancho del carrito permite ver todas las columnas', () => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(2000);
  render(
    <OrderProductTable
      anfitrionas={[]}
      productos={[
        {
          nombre: 'Botella',
          precio: 10000,
          cantidad: 1,
          subtotal: 10000,
          tipo_venta: 'botella',
          generaComision: 0,
          comision: 0
        }
      ]}
    />
  );

  expect(screen.getByRole('columnheader', { name: 'Producto' })).toBeInTheDocument();
  expect(screen.getByRole('columnheader', { name: 'Cantidad' })).toBeInTheDocument();
});
