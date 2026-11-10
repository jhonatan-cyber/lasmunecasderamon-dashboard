import { describe, expect, it, vi } from 'vitest';
import { prepareCartLine } from '@/hooks/sales/saleAddToCart';
import { agregarLineaAlCarro, calcularTotales } from '@/hooks/sales/saleCart';

vi.mock('sonner', () => ({ toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn() } }));

const deps = {
  limiteAnfitrionasDe: async () => 0,
  fetchTiers: async () => []
};

const agregar = async (linea: Awaited<ReturnType<typeof prepareCartLine>>) => {
  if (linea.kind !== 'added') throw new Error('línea bloqueada');
  return agregarLineaAlCarro([], linea.line);
};

describe('recargo de acompañamiento en el carrito de ventas', () => {
  it('suma el excedente sobre el tope al subtotal de un corto', async () => {
    const linea = await prepareCartLine({
      producto: {
        id: 'tequila-1800',
        nombre: 'Tequila 1800 Reposado',
        precio: 5000,
        comision: 0,
        tipo_venta: 'shot',
        shot_anfitriona: false,
        acompanamiento_corto: { presentacion_id: 'redbull', precio: 8000, unidades: 1 }
      },
      cantidades: {},
      topeAcompanamiento: 5000,
      ...deps
    });

    if (linea.kind !== 'added') throw new Error('línea bloqueada');
    expect(linea.line.recargo).toBe(3000);

    const carrito = await agregar(linea);
    expect(carrito).toHaveLength(1);
    expect(carrito[0].subtotal).toBe(8000);
    expect(calcularTotales(carrito, 0, true).subtotal).toBe(8000);
    expect(calcularTotales(carrito, 10, true).total).toBe(8800);
  });

  it('no suma ni resta nada cuando el acompañamiento está dentro del tope', async () => {
    const linea = await prepareCartLine({
      producto: {
        id: 'tequila-1800',
        nombre: 'Tequila 1800 Reposado',
        precio: 5000,
        comision: 0,
        tipo_venta: 'shot',
        shot_anfitriona: false,
        acompanamiento_corto: { presentacion_id: 'agua', precio: 3000, unidades: 1 }
      },
      cantidades: {},
      topeAcompanamiento: 5000,
      ...deps
    });

    if (linea.kind !== 'added') throw new Error('línea bloqueada');
    expect(linea.line.recargo).toBe(0);
    const carrito = await agregar(linea);
    expect(carrito[0].subtotal).toBe(5000);
  });

  it('multiplica el excedente por las unidades repartidas de una botella', async () => {
    const linea = await prepareCartLine({
      producto: {
        id: 'ron',
        nombre: 'Ron',
        precio: 30000,
        comision: 0,
        tipo_venta: 'botella',
        stock_bar: 5,
        acompanamiento_botella: [
          { presentacion_id: 'coca', nombre: 'Coca-Cola', unidades: 2, precio: 6000 },
          { presentacion_id: 'agua', nombre: 'Agua', unidades: 1, precio: 2000 }
        ]
      },
      cantidades: {},
      topeAcompanamiento: 5000,
      ...deps
    });

    if (linea.kind !== 'added') throw new Error('línea bloqueada');
    expect(linea.line.recargo).toBe(2000);
    const carrito = await agregar(linea);
    expect(carrito[0].subtotal).toBe(32000);
  });
});
