import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { OrderProducts } from '@/components/orders/OrderProducts';
vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfigValue: () => 50 }));

describe('Detalle completo del pedido', () => {
  it('muestra presentación, anfitrionas y bebida por ml antes de vender', () => {
    render(
      <OrderProducts
        propina={1000}
        recargoAnfitrionas={0}
        detail={[
          {
            id_pedido: 'pedido',
            producto_id: 'whisky',
            producto_nombre: 'Whisky',
            categoria: 'Licores',
            presentacion_nombre: '750 ml',
            producto_foto: '/whisky.png',
            cantidad: 2,
            precio: 20000,
            comision: 6000,
            genera_comision: 1,
            anfitrionas_asignadas_ids: 'ana,bea',
            anfitrionas_asignadas_nombres: 'Ana, Bea',
            acompanamiento_nombre: 'Sprite 500 ml',
            acompanamiento_foto: '/sprite.png',
            configuracion_venta: {
              presentacion_id: 'whisky-750',
              tipo_venta: 'shot',
              shot_anfitriona: true,
              acompanamiento_corto: { presentacion_id: 'sprite', ml_por_corto: 150 }
            }
          }
        ]}
      />
    );
    expect(screen.getByText('750 ml')).toBeInTheDocument();
    expect(screen.getByText('Anfitrionas: Ana, Bea')).toBeInTheDocument();
    expect(screen.getByText('Sprite 500 ml')).toBeInTheDocument();
    expect(screen.getByText('Consumo total: 300 ml')).toBeInTheDocument();
    expect(screen.getByText('Consumo previsto: 100 ml (50 ml por corto)')).toBeInTheDocument();
    expect(screen.getByText('$41.000')).toBeInTheDocument();
    expect(screen.getByAltText('Sprite 500 ml')).toHaveAttribute('src', '/sprite.png');
  });
});
