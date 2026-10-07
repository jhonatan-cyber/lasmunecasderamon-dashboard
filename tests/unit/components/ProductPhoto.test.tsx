import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ProductPhoto } from '@/components/shared/ProductPhoto';

afterEach(cleanup);

describe('fotos de productos procesadas antes de mostrarse', () => {
  it('solicita la foto recortada desde el primer render, sin mostrar primero el fondo original', () => {
    render(<ProductPhoto src='/api/images/products/botella.webp' alt='Botella' fill />);
    expect(screen.getByRole('img', { name: 'Botella' })).toHaveAttribute(
      'src',
      '/api/images/products/botella.webp?sin_fondo=1&recorte=2'
    );
  });
  it('normaliza las rutas públicas y conserva los parámetros de la imagen', () => {
    render(<ProductPhoto src='/img/products/botella.png?v=2' alt='Botella' />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/api/images/products/botella.png?v=2&sin_fondo=1&recorte=2'
    );
  });
  it('al cambiar de producto solicita su propio recorte', () => {
    const { rerender } = render(
      <ProductPhoto src='/api/images/products/primera.png' alt='Producto' />
    );
    rerender(<ProductPhoto src='/api/images/products/segunda.png' alt='Producto' />);
    expect(screen.getByRole('img')).toHaveAttribute(
      'src',
      '/api/images/products/segunda.png?sin_fondo=1&recorte=2'
    );
  });
  it('conserva el placeholder sin procesarlo con el modelo', () => {
    render(<ProductPhoto src='/api/images/products/default.png' alt='Sin foto' />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/api/images/products/default.png');
  });
});
