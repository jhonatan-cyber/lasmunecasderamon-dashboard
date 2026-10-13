import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import OrderProductTable from '@/components/orders/OrderProductTable';
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
  expect(screen.getByRole('columnheader', { name: 'Bebida y consumo' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Corto anfitriona' })).toBeInTheDocument();
  expect(screen.getByText('Sprite 350 ml')).toBeInTheDocument();
  expect(screen.getByText('150 ml por corto')).toBeInTheDocument();
  expect(screen.getByText('Consumo total: 300 ml')).toBeInTheDocument();
  expect(screen.getByText('20 ml por corto \u00b7 40 ml de trago')).toBeInTheDocument();
});
