import { expect, it, vi } from 'vitest';
const readFile = vi.hoisted(() => vi.fn());
vi.mock('node:fs/promises', () => ({ default: { readFile } }));
import { GET } from '@/app/api/images/users/[filename]/route';
const get = (filename: string) =>
  GET(new Request('http://localhost'), { params: Promise.resolve({ filename }) });
it('sirve una foto WebP creada después del arranque', async () => {
  readFile.mockResolvedValue(Buffer.from('image'));
  const response = await get('user_123.webp');
  expect(response.status).toBe(200);
  expect(response.headers.get('Content-Type')).toBe('image/webp');
  expect(await response.text()).toBe('image');
});
it('rechaza rutas fuera de la carpeta de fotos', async () => {
  expect((await get('../secret.webp')).status).toBe(400);
});
it('devuelve 404 sin cachear cuando falta la foto', async () => {
  readFile.mockRejectedValue(Object.assign(new Error('missing'), { code: 'ENOENT' }));
  const response = await get('missing.webp');
  expect(response.status).toBe(404);
  expect(response.headers.get('Cache-Control')).toBe('no-store');
});
