import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ShotMixerSelection } from '@/components/sales/new/ShotMixerSelection';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('selecciona el sabor disponible y actualiza los ml al cambiar la cantidad de cortos', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          {
            id: 'soda',
            producto_nombre: 'Soda limón',
            nombre: '500 ml',
            stock_bar: 1,
            ml_abierta: 300
          },
          { id: 'sin-stock', producto_nombre: 'Cola', nombre: '500 ml', stock_bar: 0 }
        ]
      })
    })
  );
  function Form() {
    const [productos, setProductos] = useState<any[]>([
      {
        nombre: 'Whisky',
        id: 'licor',
        presentacion_id: 'licor',
        tipo_venta: 'shot',
        cantidad: 2,
        precio: 3000
      }
    ]);
    return (
      <>
        <ShotMixerSelection productos={productos} setProductos={setProductos} />
        <button onClick={() => setProductos(prev => prev.map(p => ({ ...p, cantidad: 3 })))}>
          Otro corto
        </button>
      </>
    );
  }
  render(<Form />);
  await screen.findByRole('option', { name: /Soda limón/ });
  expect(screen.queryByRole('option', { name: /Cola/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Soda o gaseosa para Whisky'), {
    target: { value: 'soda' }
  });
  fireEvent.change(screen.getByLabelText('Ml de acompañamiento para Whisky'), {
    target: { value: '100' }
  });
  expect(screen.getByText('Consumo incluido: 200 ml de Soda limón 500 ml')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Otro corto'));
  expect(screen.getByText('Consumo incluido: 300 ml de Soda limón 500 ml')).toBeInTheDocument();
});
it('valida el consumo y rechaza usar la propia bebida como acompañamiento', () => {
  const detail = {
    producto_id: 'licor',
    presentacion_id: 'licor',
    tipo_venta: 'shot',
    precio: 3000,
    cantidad: 2,
    acompanamiento_corto: { presentacion_id: 'soda', ml_por_corto: 100 }
  };
  expect(SaleCreateSchema.shape.detalles.parse([detail])[0].acompanamiento_corto).toEqual(
    detail.acompanamiento_corto
  );
  for (const ml of [0, -1, 0.5, 10001])
    expect(
      SaleCreateSchema.shape.detalles.safeParse([
        { ...detail, acompanamiento_corto: { presentacion_id: 'soda', ml_por_corto: ml } }
      ]).success
    ).toBe(false);
  expect(
    SaleCreateSchema.shape.detalles.safeParse([
      { ...detail, acompanamiento_corto: { presentacion_id: 'licor', ml_por_corto: 100 } }
    ]).success
  ).toBe(false);
});
