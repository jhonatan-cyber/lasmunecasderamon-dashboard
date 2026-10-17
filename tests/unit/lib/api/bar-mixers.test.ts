import { beforeEach, expect, it, vi } from 'vitest';
const stock = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api/withRoute', () => ({
  withPublicRoute: (handler: unknown) => handler,
  withRoute: (_options: unknown, handler: unknown) => handler
}));
vi.mock('@/modules/inventario', () => ({ ProductService: { listBarStock: stock } }));
import { GET } from '@/app/api/bar/route';
beforeEach(() => {
  stock.mockReset().mockResolvedValue([]);
});
it('pide el catálogo de bebidas analcohólicas para los selectores de acompañamiento', async () => {
  await GET(new Request('http://localhost/api/bar?acompanamientos=1'), {} as any);
  expect(stock).toHaveBeenCalledWith(undefined, true);
});
it('conserva el catálogo completo para el módulo Bar', async () => {
  await GET(new Request('http://localhost/api/bar'), {} as any);
  expect(stock).toHaveBeenCalledWith(undefined);
});
