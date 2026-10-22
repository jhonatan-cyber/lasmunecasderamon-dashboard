'use client';
import React, { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, vi } from 'vitest';
import SaleProductModal from '@/components/sales/SaleProductModal';

/**
 * Utillaje compartido por los tests de `SaleProductModal`.
 *
 * El archivo original creció hasta superar el presupuesto de 30 s por archivo
 * que vigila `DurationBudgetReporter` (importar el modal arrastra un grafo de
 * módulos grande y se pagaba una sola vez, pero 18 tests de render en el mismo
 * archivo lo llevaban al límite del timeout de RPC de Vitest). Los fixtures, el
 * `Harness` y el helper `selectMixer` viven aquí para que los dos archivos de
 * test compartan exactamente el mismo escenario.
 *
 * Los `vi.mock` NO viven aquí: Vitest los iza por archivo, así que cada test
 * debe declararlos antes de importar (indirectamente) el componente.
 */

export const product = {
  id: 'presentation-1',
  nombre: 'Producto de prueba',
  foto: 'producto.webp',
  stock_bar: 5,
  precio: 4000,
  comision: 0,
  opciones_venta: [
    { tipo: 'botella', precio: 4000, comision: 0 },
    { tipo: 'shot', precio: 1000, comision: 0 }
  ]
};

/** Respuesta estándar de `/api/products/presentations` con un caso sin stock y otro negativo. */
export const presentacionesDePrueba = {
  ok: true,
  json: async () => ({
    success: true,
    data: [
      {
        id: 'sprite',
        producto_nombre: 'Sprite',
        nombre: '350 ml',
        stock_bar: 20,
        foto: 'sprite.webp'
      },
      { id: 'cola', producto_nombre: 'Coca-Cola', nombre: '350 ml', stock_bar: 20 },
      {
        id: 'sin-stock',
        producto_nombre: 'Sin stock',
        nombre: '350 ml',
        stock_bar: 0,
        ml_abierta: 1000
      },
      { id: 'negativo', producto_nombre: 'Stock negativo', nombre: '350 ml', stock_bar: -1 }
    ]
  })
};

export async function selectMixer() {
  await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toBeEnabled());
  for (const selector of screen.getAllByRole('combobox')) {
    fireEvent.click(selector);
    await screen.findByRole('option', { name: /Sprite/ });
    fireEvent.click(screen.getByRole('option', { name: /Sprite/ }));
  }
}

export function Harness({
  productos,
  onAdd,
  onClose = vi.fn(),
  productosEnCarrito = []
}: {
  productos: any[];
  onAdd: (p: any) => void;
  onClose?: () => void;
  productosEnCarrito?: any[];
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  return (
    <SaleProductModal
      open
      onClose={onClose}
      loading={false}
      productos={productos}
      cantidades={quantities}
      handleCantidadChange={(id, value) =>
        setQuantities(prev => ({ ...prev, [id]: Number(value) }))
      }
      handleAgregarProducto={onAdd}
      categoria={{ nombre: 'Bebidas' }}
      anfitrionas={[]}
      champagneHostessSelections={{}}
      onChampagneHostessChange={vi.fn()}
      otherProductHostessSelections={{}}
      onOtherProductHostessChange={vi.fn()}
      productosEnCarrito={productosEnCarrito}
    />
  );
}
