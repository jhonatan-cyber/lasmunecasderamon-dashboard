import { describe, expect, it } from 'vitest';
import { groupLabelUnits, labelDate } from '@/lib/utils/unitLabelGroups';

describe('grupos de etiquetas', () => {
  const units = [
    { id: '1', codigo: '1', compra_folio: 'C-0001', fecha_crea: '2026-09-22' },
    { id: '2', codigo: '2', compra_folio: 'C-0002', fecha_crea: '2026-09-22' },
    { id: '3', codigo: '3', fecha_crea: '2026-09-21' }
  ];
  it('separa compras y agrupa las unidades sin compra por fecha', () => {
    expect(groupLabelUnits(units, 'purchase').map(g => g.title)).toEqual([
      'Compra C-0001',
      'Compra C-0002',
      'Sin compra · 2026-09-21'
    ]);
    expect(groupLabelUnits(units, 'date').map(g => g.units.length)).toEqual([2, 1]);
  });
  it('respeta el dia del negocio cerca de medianoche UTC', () => {
    expect(labelDate('2026-09-22T01:00:00Z')).toBe('2026-09-21');
    expect(labelDate(null)).toBe('Sin fecha');
  });

  it('agrupa por producto conservando el orden de aparición', () => {
    const porProducto = [
      { id: '1', codigo: '1', producto_nombre: 'Ron Habana' },
      { id: '2', codigo: '2', producto_nombre: 'Ron Habana' },
      { id: '3', codigo: '3', producto_nombre: 'Coca Cola' },
      { id: '4', codigo: '4' }
    ];
    const grupos = groupLabelUnits(porProducto, 'product');
    expect(grupos.map(g => g.title)).toEqual(['Ron Habana', 'Coca Cola', 'Sin producto']);
    expect(grupos.map(g => g.units.length)).toEqual([2, 1, 1]);
  });

  it('no confunde el nombre de producto vacío con un grupo real', () => {
    expect(groupLabelUnits([{ id: '1', codigo: '1', producto_nombre: '   ' }], 'product')).toEqual([
      { title: 'Sin producto', units: [{ id: '1', codigo: '1', producto_nombre: '   ' }] }
    ]);
  });
});
