import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PurchaseCodesPanel,
  purchaseCodesToLabelUnits
} from '@/components/purchases/PurchaseCodesPanel';
import type { PurchaseGeneratedCode } from '@/types/purchase';

vi.mock('@/lib/utils/printUnitLabels', () => ({ printUnitLabels: vi.fn() }));

afterEach(cleanup);

const codigo = (overrides: Partial<PurchaseGeneratedCode>): PurchaseGeneratedCode => ({
  id: 'u1',
  codigo: 'LM-1',
  codigo_barras: '2900000000001',
  producto_id: 'prod-1',
  producto_nombre: 'Ron Habana',
  presentacion_id: 'pres-1',
  presentacion_nombre: 'Botella 750ml',
  compra_folio: 'C-0001',
  ...overrides
});

describe('purchaseCodesToLabelUnits', () => {
  it('adapta los códigos de la compra a etiquetas imprimibles en almacén', () => {
    expect(purchaseCodesToLabelUnits([codigo({})], '2026-09-27T12:00:00Z')).toEqual([
      {
        id: 'u1',
        codigo: 'LM-1',
        codigo_barras: '2900000000001',
        compra_folio: 'C-0001',
        fecha_crea: '2026-09-27T12:00:00Z',
        estado: 'almacen',
        producto_nombre: 'Ron Habana',
        presentacion_nombre: 'Botella 750ml'
      }
    ]);
  });

  it('deja la fecha vacía cuando la compra no la reporta', () => {
    expect(purchaseCodesToLabelUnits([codigo({})])[0].fecha_crea).toBeNull();
  });
});

describe('PurchaseCodesPanel', () => {
  it('muestra el resumen y los códigos agrupados por producto', () => {
    render(
      <PurchaseCodesPanel
        folio='C-0001'
        codigos={[
          codigo({ id: 'u1' }),
          codigo({ id: 'u2', codigo: 'LM-2', codigo_barras: '2900000000002' }),
          codigo({
            id: 'u3',
            codigo: 'LM-3',
            codigo_barras: '2900000000003',
            producto_nombre: 'Coca Cola',
            presentacion_nombre: 'Lata 350ml'
          })
        ]}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Compra C-0001 registrada')).toBeInTheDocument();
    expect(screen.getByText(/3 códigos generados, agrupados por producto/)).toBeInTheDocument();
    // Un grupo por producto, cada código con su presentación.
    expect(screen.getByRole('region', { name: 'Ron Habana' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Coca Cola' })).toBeInTheDocument();
    expect(screen.getAllByText('Botella 750ml')).toHaveLength(2);
    expect(screen.getByText('Lata 350ml')).toBeInTheDocument();
  });

  it('avisa cuando la compra no generó códigos', () => {
    render(<PurchaseCodesPanel folio='C-0002' codigos={[]} onClose={() => {}} />);

    expect(screen.getByText('Sin códigos generados en esta compra.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Imprimir/ })).not.toBeInTheDocument();
  });
});
