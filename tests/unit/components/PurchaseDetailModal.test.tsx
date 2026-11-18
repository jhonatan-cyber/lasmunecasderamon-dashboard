import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PurchaseDetailModal } from '@/components/purchases/PurchaseDetailModal';
import { printUnitLabels } from '@/lib/utils/printUnitLabels';
import type { PurchaseRecord } from '@/types/purchase';

vi.mock('@/lib/utils/printUnitLabels', () => ({ printUnitLabels: vi.fn() }));

const compra: PurchaseRecord = {
  id: 'compra-1',
  folio: 'C-0001',
  total: 240,
  proveedor: 'Distribuidora',
  telefono: null,
  observaciones: null,
  metodo_pago: 'efectivo',
  usuario_id: 'u-1',
  usuario_nombre: 'Ana',
  fecha_crea: '2026-10-09T12:00:00.000Z',
  detalles: [
    {
      id: 'det-1',
      producto_id: 'prod-1',
      presentacion_id: 'pres-1',
      cantidad: 2,
      precio_compra: 120,
      subtotal: 240,
      producto_nombre: 'Ron Habana',
      presentacion_nombre: 'Botella 750 ml',
      producto_foto: null,
      presentacion_foto: null
    }
  ]
};

const codigosCompra = [
  {
    id: 'u1',
    codigo: 'LM-1',
    codigo_barras: '2900000000001',
    producto_id: 'prod-1',
    producto_nombre: 'Ron Habana',
    presentacion_id: 'pres-1',
    presentacion_nombre: 'Botella 750 ml',
    compra_folio: 'C-0001'
  },
  {
    id: 'u2',
    codigo: 'LM-2',
    codigo_barras: '2900000000002',
    producto_id: 'prod-1',
    producto_nombre: 'Ron Habana',
    presentacion_id: 'pres-1',
    presentacion_nombre: 'Botella 750 ml',
    compra_folio: 'C-0001'
  }
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

it('muestra los códigos generados de la compra agrupados por presentación', async () => {
  const fetchMock = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(Response.json({ success: true, data: codigosCompra }));

  render(<PurchaseDetailModal purchase={compra} onClose={() => {}} />);

  expect(fetchMock).toHaveBeenCalledWith('/api/purchases/compra-1/codes', expect.anything());
  expect(await screen.findByText('2900000000001')).toBeInTheDocument();
  expect(screen.getByText('2900000000002')).toBeInTheDocument();
  expect(screen.getByText('Ron Habana · Botella 750 ml')).toBeInTheDocument();
  expect(screen.getByText('2 códigos')).toBeInTheDocument();
});

it('imprime las etiquetas de los códigos generados', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    Response.json({ success: true, data: codigosCompra })
  );

  render(<PurchaseDetailModal purchase={compra} onClose={() => {}} />);

  fireEvent.click(await screen.findByRole('button', { name: 'Imprimir códigos' }));

  expect(vi.mocked(printUnitLabels)).toHaveBeenCalledWith([
    {
      code: '2900000000001',
      producto_nombre: 'Ron Habana',
      presentacion_nombre: 'Botella 750 ml'
    },
    {
      code: '2900000000002',
      producto_nombre: 'Ron Habana',
      presentacion_nombre: 'Botella 750 ml'
    }
  ]);
});
