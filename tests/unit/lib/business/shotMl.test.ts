import { describe, expect, it } from 'vitest';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';

describe('resolveShotMl', () => {
  it('usa el ml del producto cuando está definido', () => {
    expect(resolveShotMl(75, 50)).toBe(75);
  });

  it('cae al valor global cuando el producto no define los suyos', () => {
    expect(resolveShotMl(null, 50)).toBe(50);
    expect(resolveShotMl(undefined, 50)).toBe(50);
    expect(resolveShotMl(0, 50)).toBe(50);
  });
});

describe('resolveShotMlAnfitriona', () => {
  it('usa el ml de anfitriona cuando está definido', () => {
    expect(resolveShotMlAnfitriona(40, 50)).toBe(40);
  });

  it('cae al ml de cliente cuando no hay valor propio', () => {
    expect(resolveShotMlAnfitriona(null, 50)).toBe(50);
    expect(resolveShotMlAnfitriona(undefined, 50)).toBe(50);
    expect(resolveShotMlAnfitriona(0, 50)).toBe(50);
  });
});
