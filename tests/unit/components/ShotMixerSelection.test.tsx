import React, { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ShotMixerSelection } from '@/components/sales/new/ShotMixerSelection';
import { SaleCreateSchema } from '@/lib/business/schemas/sale';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it('selecciona el sabor disponible y actualiza las unidades al cambiar la cantidad de cortos', async () => {
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
            stock_bar: 3,
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
  expect(screen.getByText('Consumo incluido: 2 unidades de Soda limón 500 ml')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Otro corto'));
  expect(screen.getByText('Consumo incluido: 3 unidades de Soda limón 500 ml')).toBeInTheDocument();
});
it('descuenta los ml configurados al elegir Coca-Cola o Sprite para cortos de anfitriona', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [
          { id: 'cola', producto_nombre: 'Coca-Cola', nombre: '350 ml', stock_bar: 3 },
          { id: 'sprite', producto_nombre: 'Sprite', nombre: '350 ml', stock_bar: 3 }
        ]
      })
    })
  );
  function Form() {
    const [productos, setProductos] = useState<any[]>([
      {
        id: 'whisky',
        nombre: 'Whisky',
        tipo_venta: 'shot',
        shot_anfitriona: true,
        cantidad: 2,
        opciones_venta: [{ tipo: 'shot', ml_acompanamiento_anfitriona: 150 }]
      }
    ]);
    return <ShotMixerSelection productos={productos} setProductos={setProductos} />;
  }
  render(<Form />);
  await screen.findByRole('option', { name: /Coca-Cola/ });
  expect(screen.getByRole('option', { name: /Sprite/ })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Soda o gaseosa para Whisky'), {
    target: { value: 'sprite' }
  });
  expect(screen.getByText('Consumo incluido: 300 ml de Sprite 350 ml')).toBeInTheDocument();
});
it('valida el consumo y rechaza usar la propia bebida como bebida', () => {
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
