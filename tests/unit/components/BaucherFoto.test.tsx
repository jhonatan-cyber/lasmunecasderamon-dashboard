import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BaucherFoto } from '@/components/shared/BaucherFoto';

afterEach(cleanup);

it('muestra la foto del baucher y deja abrir la imagen completa', () => {
  render(<BaucherFoto src='/api/tickets/e1/baucher' descripcion='Ana · 19/10/2026 · 20:30' />);

  expect(screen.getByText('Baucher de la transferencia')).toBeInTheDocument();
  const foto = screen.getByRole('img', { name: 'Baucher de Ana · 19/10/2026 · 20:30' });
  expect(foto).toHaveAttribute('src', '/api/tickets/e1/baucher');

  const enlace = screen.getByRole('link', { name: /Ver completa/ });
  expect(enlace).toHaveAttribute('href', '/api/tickets/e1/baucher');
  expect(enlace).toHaveAttribute('target', '_blank');
});

it('avisa cuando la foto ya no está en disco', () => {
  render(<BaucherFoto src='/api/tickets/e1/baucher' descripcion='Ana' />);

  fireEvent.error(screen.getByRole('img'));

  expect(screen.getByText('No se pudo cargar la foto del baucher.')).toBeInTheDocument();
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
  // El enlace sigue visible: revisar la imagen completa no depende de la miniatura.
  expect(screen.getByRole('link', { name: /Ver completa/ })).toBeInTheDocument();
});
