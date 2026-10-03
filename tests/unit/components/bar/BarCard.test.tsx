import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { BarCard } from '@/components/bar/BarCard';
import type { BarStockItem } from '@/components/bar/TransferModal';

// La tarjeta pide los niveles de precio de anfitrionas al backend: aquí no interesa.
vi.mock('@/components/bar/BarAnfitrionas', () => ({
  BarAnfitrionas: () => <div>anfitrionas</div>,
  isTierPricedItem: () => false
}));

// La foto recorta el fondo con un canvas, que jsdom no implementa: este test es de números.
vi.mock('@/components/shared/ProductPhoto', () => ({
  ProductPhoto: () => <div>foto</div>
}));

const item = (extra: Partial<BarStockItem> = {}): BarStockItem =>
  ({
    id: 'pres-1',
    producto_id: 'prod-1',
    producto_nombre: 'Mistral',
    producto_codigo: 'M1',
    producto_foto: null,
    codigo_barras: '654123698',
    nombre: '1000 ml',
    precio_compra: 30000,
    precio_venta: 70000,
    comision: 15000,
    foto: null,
    stock: 0,
    stock_bar: 5,
    ml_abierta: 950,
    ml_servidos: 50,
    ...extra
  }) as BarStockItem;

beforeEach(() => {
  // `useConfigValue` pide /api/configurations al montar; sin red se queda con los
  // defaults (50 ml por shot, 750 ml por botella), que es lo que hay que probar.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('capacidad de la botella en la tarjeta del bar', () => {
  it('muestra lo que queda junto a la capacidad real de la botella', () => {
    render(<BarCard item={item({ ml_botella: 1000 })} />);

    expect(screen.getByText(/Abierta: 950 de 1000 ml/)).toBeInTheDocument();
    // El resto de los números de la tarjeta no cambian.
    expect(screen.getByText(/≈19 shots/)).toBeInTheDocument();
    expect(screen.getByText(/Shots servidos: 50 ml/)).toBeInTheDocument();
  });

  it('toma la capacidad del nombre cuando la presentación no la tiene guardada', () => {
    // Sin `ml_botella` el nombre es lo único que dice el formato: si la tarjeta cayera
    // al default de 750, volvería a mostrar el número contra el que hay que cotejar.
    render(<BarCard item={item({ ml_botella: null })} />);

    expect(screen.getByText(/Abierta: 950 de 1000 ml/)).toBeInTheDocument();
  });

  it('cae al default de Configuraciones cuando ni la columna ni el nombre dicen volumen', () => {
    render(<BarCard item={item({ ml_botella: null, nombre: 'Botella chica' })} />);

    expect(screen.getByText(/Abierta: 950 de 750 ml/)).toBeInTheDocument();
  });

  it('deja ver que el saldo no cabe en la botella cuando los datos no cuadran', () => {
    // Capacidad editada a la baja con una botella ya abierta: el número tiene que delatar
    // el desajuste en la misma línea, sin tener que abrir el producto.
    render(<BarCard item={item({ ml_botella: 700 })} />);

    expect(screen.getByText(/Abierta: 950 de 700 ml/)).toBeInTheDocument();
  });

  it('sin botella abierta no muestra ni el saldo ni la capacidad', () => {
    render(<BarCard item={item({ ml_abierta: 0, ml_servidos: 0 })} />);

    expect(screen.queryByText(/Abierta:/)).not.toBeInTheDocument();
    expect(screen.getByText('1000 ml')).toBeInTheDocument();
  });
});
