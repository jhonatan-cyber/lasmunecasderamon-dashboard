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
});
