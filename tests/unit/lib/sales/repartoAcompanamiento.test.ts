import { describe, expect, it } from 'vitest';
import { dividirRepartoPorEntrega, recortarReparto } from '@/lib/sales/repartoAcompanamiento';

const sabor = (presentacion_id: string, unidades: number, nombre?: string) => ({
  presentacion_id,
  unidades,
  ...(nombre ? { nombre } : {})
});

describe('dividirRepartoPorEntrega', () => {
  it('reparte un cover por corte y permite sabores distintos', () => {
    expect(dividirRepartoPorEntrega([sabor('coca', 2), sabor('sprite', 1)], 1, 3)).toEqual([
      [sabor('coca', 1)],
      [sabor('coca', 1)],
      [sabor('sprite', 1)]
    ]);
  });

  it('divide una botella de 3 bebidas por botella entre dos botellas', () => {
    expect(dividirRepartoPorEntrega([sabor('coca', 4), sabor('sprite', 2)], 3, 2)).toEqual([
      [sabor('coca', 3)],
      [sabor('coca', 1), sabor('sprite', 2)]
    ]);
  });

  it('no repite un sabor dentro de la misma entrega', () => {
    const grupos = dividirRepartoPorEntrega(
      [sabor('coca', 2), sabor('sprite', 2), sabor('agua', 2)],
      3,
      2
    );
    for (const grupo of grupos) {
      const ids = grupo.map(item => item.presentacion_id);
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(grupos).toEqual([
      [sabor('coca', 2), sabor('sprite', 1)],
      [sabor('sprite', 1), sabor('agua', 2)]
    ]);
  });

  it('conserva los datos del sabor (nombre, foto, precio) en cada entrega', () => {
    const [grupo] = dividirRepartoPorEntrega(
      [{ presentacion_id: 'coca', unidades: 1, nombre: 'Coca-Cola', precio: 5000 }],
      1,
      1
    );
    expect(grupo[0]).toMatchObject({ nombre: 'Coca-Cola', precio: 5000 });
  });

  it('entrega grupos vacíos si el reparto no alcanza', () => {
    expect(dividirRepartoPorEntrega([sabor('coca', 1)], 1, 2)).toEqual([[sabor('coca', 1)], []]);
  });
});

describe('recortarReparto', () => {
  it('recorta las unidades sobrantes y elimina sabores vacíos', () => {
    expect(recortarReparto([sabor('coca', 2), sabor('sprite', 2)], 3)).toEqual([
      sabor('coca', 2),
      sabor('sprite', 1)
    ]);
    expect(recortarReparto([sabor('coca', 1)], 0)).toEqual([]);
  });

  it('no modifica el reparto original', () => {
    const original = [sabor('coca', 3)];
    expect(recortarReparto(original, 1)).toEqual([sabor('coca', 1)]);
    expect(original).toEqual([sabor('coca', 3)]);
  });
});
