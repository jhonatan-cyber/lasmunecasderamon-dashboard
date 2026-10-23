import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BarProductGrid } from '@/components/bar/BarProductGrid';
import type { BarStockItem } from '@/components/bar/transfer/transferOptions';

vi.mock('@/components/bar/BarCard', () => ({
  BarCard: ({ item }: { item: BarStockItem }) => {
    const [open, setOpen] = useState(false);
    return (
      <div data-testid={item.id}>
        <button onClick={() => setOpen(!open)}>{item.producto_nombre}</button>
        {open && <p>Detalle {item.id}</p>}
      </div>
    );
  }
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('mantiene cada producto en su columna al desplegar una tarjeta', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800
  } as DOMRect);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    }
  );
  const items = Array.from(
    { length: 6 },
    (_, i) => ({ id: `p${i}`, producto_nombre: `Producto ${i}` }) as BarStockItem
  );
  const { container } = render(<BarProductGrid items={items} />);
  const columns = container.querySelectorAll('[data-product-column]');
  expect(columns).toHaveLength(3);
  // La tarjeta vive dentro de su columna (con el contenedor de arrastre en medio).
  expect(screen.getByTestId('p3').closest('[data-product-column]')).toBe(columns[0]);
  expect(screen.getByTestId('p4').closest('[data-product-column]')).toBe(columns[1]);
  expect(screen.getByTestId('p5').closest('[data-product-column]')).toBe(columns[2]);
  fireEvent.click(screen.getByRole('button', { name: 'Producto 0' }));
  expect(screen.getByText('Detalle p0')).toBeInTheDocument();
  expect(screen.getByTestId('p4').closest('[data-product-column]')).toBe(columns[1]);
  expect(screen.getByTestId('p5').closest('[data-product-column]')).toBe(columns[2]);
  expect(columns[1]).not.toHaveTextContent('Detalle');
  expect(columns[2]).not.toHaveTextContent('Detalle');
});
