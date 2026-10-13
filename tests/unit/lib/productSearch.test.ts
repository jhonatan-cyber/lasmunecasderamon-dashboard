import { describe, expect, it } from 'vitest';
import { matchesProductSearch } from '@/lib/utils/productSearch';

describe('búsqueda de productos', () => {
  const product = {
    name: 'Ron añejo',
    categoria: 'Destilados',
    presentaciones: [{ nombre: 'Botella 750 ml', codigo_barras: '7801234567890' }]
  };
  it.each(['ron', 'ANEJO', 'destilados', '750', '7801234567890'])(
    'encuentra %s en el catálogo',
    term => {
      expect(matchesProductSearch(product, term)).toBe(true);
    }
  );
  it('admite filas del bar y excluye coincidencias inexistentes', () => {
    expect(
      matchesProductSearch(
        {
          producto_nombre: 'Coca-Cola',
          categoria_nombre: 'Bebidas',
          nombre: 'Lata',
          codigo_barras: '1234'
        },
        'bebidas'
      )
    ).toBe(true);
    expect(matchesProductSearch(product, 'sprite')).toBe(false);
  });
});
