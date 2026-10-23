import { describe, expect, it } from 'vitest';
import { moverEnListadoFiltrado } from '@/components/bar/barOrder';

interface Producto {
  id: string;
}

const productos: Producto[] = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
const ids = (items: Producto[] | null) => items?.map(item => item.id);

describe('moverEnListadoFiltrado', () => {
  it('mueve lo visible sin desordenar las presentaciones ocultas', () => {
    // Búsqueda activa: solo «a» y «c» están a la vista.
    expect(ids(moverEnListadoFiltrado(productos, [productos[0], productos[2]], 'c', 'a'))).toEqual([
      'c',
      'b',
      'a',
      'd'
    ]);
  });

  it('reordena el listado completo cuando no hay filtros', () => {
    expect(ids(moverEnListadoFiltrado(productos, productos, 'd', 'b'))).toEqual([
      'a',
      'd',
      'b',
      'c'
    ]);
  });

  it('no inventa un movimiento si algún id no está a la vista', () => {
    expect(moverEnListadoFiltrado(productos, [productos[0]], 'c', 'a')).toBeNull();
    expect(moverEnListadoFiltrado(productos, productos, 'b', 'b')).toBeNull();
  });
});
