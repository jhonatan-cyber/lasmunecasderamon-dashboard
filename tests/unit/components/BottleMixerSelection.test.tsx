import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BottleMixerSelection } from '@/components/sales/new/BottleMixerSelection';
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('elige el producto al vender y conserva las unidades configuradas y el precio', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { id: 'sprite', producto_nombre: 'Sprite', nombre: 'Lata', stock_bar: 6 },
          { id: 'fanta', producto_nombre: 'Fanta', nombre: 'Lata', stock_bar: 1 }
        ]
      })
    }))
  );
  function Form() {
    const [productos, setProductos] = useState<any[]>([
      {
        id: 'ron',
        nombre: 'Ron',
        tipo_venta: 'botella',
        cantidad: 2,
        precio: 50000,
        unidades_acompanamiento: 3
      }
    ]);
    return (
      <>
        <BottleMixerSelection productos={productos} setProductos={setProductos} />
        <output>{JSON.stringify(productos)}</output>
      </>
    );
  }
  render(<Form />);
  await screen.findByRole('option', { name: 'Sprite · Lata' });
  expect(screen.queryByRole('option', { name: 'Fanta · Lata' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Bebida para Ron'), {
    target: { value: 'sprite' }
  });
  const result = JSON.parse(screen.getByRole('status').textContent || '[]')[0];
  expect(result.acompanamiento_botella).toEqual({ presentacion_id: 'sprite', unidades: 3 });
  expect(result.precio).toBe(50000);
});
