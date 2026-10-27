import { describe, expect, it } from 'vitest';
import { DEFAULT_PRODUCT_IMAGE, productImageUrl } from '@/lib/utils/productImage';

describe('productImageUrl', () => {
  it('usa la imagen por defecto cuando no hay candidatas válidas', () => {
    expect(productImageUrl()).toBe(DEFAULT_PRODUCT_IMAGE);
    expect(productImageUrl(null, undefined, '')).toBe(DEFAULT_PRODUCT_IMAGE);
    expect(productImageUrl('default.png', 'default.png')).toBe(DEFAULT_PRODUCT_IMAGE);
  });

  it('resuelve nombres de archivo contra el endpoint de productos', () => {
    expect(productImageUrl('botella.webp')).toBe('/api/images/products/botella.webp');
  });

  it('respeta URLs absolutas, blobs y rutas ya resueltas', () => {
    expect(productImageUrl('https://cdn.example.com/foto.webp')).toBe(
      'https://cdn.example.com/foto.webp'
    );
    expect(productImageUrl('blob:http://localhost/foto')).toBe('blob:http://localhost/foto');
    expect(productImageUrl('/img/products/foto.webp')).toBe('/img/products/foto.webp');
  });

  it('usa la primera candidata válida', () => {
    expect(productImageUrl('default.png', 'producto.webp')).toBe(
      '/api/images/products/producto.webp'
    );
    expect(productImageUrl('', 'https://cdn.example.com/foto.webp', 'otra.webp')).toBe(
      'https://cdn.example.com/foto.webp'
    );
  });
});
