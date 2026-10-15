import { afterEach, expect, it, vi } from 'vitest';
import { fetchCollection } from '@/lib/api/fetchCollection';
afterEach(() => vi.unstubAllGlobals());
it.each([
  [500, { success: true, data: [] }],
  [200, { success: false, data: [] }],
  [200, { success: true, data: {} }]
])(
  'rechaza respuestas inválidas sin convertirlas en una lista vacía (%s)',
  async (status, data) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(data, { status: status as number }))
    );
    await expect(fetchCollection('/api/bar')).rejects.toThrow();
  }
);
it('acepta una colección vacía real', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ success: true, data: [] }))
  );
  await expect(fetchCollection('/api/bar')).resolves.toEqual([]);
});
