import { describe, expect, it } from 'vitest';
import { matchesTarget, realtimeTargets } from '@/lib/utils/realtimeTargets';

const CATALOGO_COLACIONES = ['/api/products/for-sale'];

describe('refresco en vivo del catálogo de colaciones', () => {
  it.each([
    { type: 'updateSales' },
    { type: 'transfers_updated' },
    { type: 'categories_updated' },
    { type: 'resource_updated', data: { module: 'products' } },
    { type: 'resource_updated', data: { module: 'sales' } }
  ])('reacciona al evento $type', payload => {
    expect(matchesTarget(CATALOGO_COLACIONES, realtimeTargets(payload))).toBe(true);
  });

  it('no reacciona a eventos ajenos al inventario del bar', () => {
    expect(
      matchesTarget(CATALOGO_COLACIONES, realtimeTargets({ type: 'attendance_registered' }))
    ).toBe(false);
  });
});
