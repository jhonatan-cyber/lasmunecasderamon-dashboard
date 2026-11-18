import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferHistoryDetailModal } from '@/components/bar/transfer/TransferHistoryDetailModal';
import type { TransferRecord } from '@/types/transfer';

vi.mock('@/hooks/shared/useConfigValue', () => ({ useConfig: () => 50 }));
vi.mock('@/components/bar/BarAnfitrionas', () => ({
  BarAnfitrionas: () => null,
  isTierPricedItem: () => false
}));
afterEach(cleanup);

const record = (overrides: Partial<TransferRecord>): TransferRecord => ({
  id: 't1',
  producto_id: 'p1',
  producto_nombre: 'Johnnie Walker',
  presentacion_nombre: 'Botella 750 ml',
  categoria_nombre: 'Whisky',
  cantidad: 1,
  fecha_crea: '2026-11-18T12:00:00',
  usuario_nombre: 'Jefa de barra',
  usuario_id: 'u1',
  estado: 'aceptada',
  aceptado_por: null,
  aceptado_nombre: 'Barman',
  fecha_aceptacion: '2026-11-18T13:00:00',
  precio_venta: 0,
  comision: 0,
  ...overrides
});

const renderModal = (item: TransferRecord) =>
  render(<TransferHistoryDetailModal record={item} onOpenChange={() => {}} />);

describe('TransferHistoryDetailModal precios del historial', () => {
  it('muestra los precios configurados por forma de venta sin duplicar un resumen', () => {
    renderModal(
      record({
        precio_venta: 30000,
        comision: 5000,
        opciones_venta: [
          { tipo: 'botella', precio: 30000, comision: 5000, precio_sin_anfitriona: 18000 }
        ]
      })
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Con anfitriona')).toBeInTheDocument();
    expect(within(dialog).getByText('$30.000')).toBeInTheDocument();
    expect(within(dialog).getByText('Comisión: $5.000')).toBeInTheDocument();
    expect(within(dialog).getByText('$18.000')).toBeInTheDocument();
    expect(within(dialog).queryByText('Precio de venta')).toBeNull();
  });

  it('sin venta con anfitriona solo lista la botella sin anfitriona', () => {
    renderModal(
      record({
        precio_venta: 18000,
        comision: 0,
        opciones_venta: [
          {
            tipo: 'botella',
            precio: 0,
            comision: 0,
            precio_sin_anfitriona: 18000,
            vender_con_anfitriona: false
          }
        ]
      })
    );

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByText('Precio de venta')).toBeNull();
    expect(within(dialog).getByText('Botella sin anfitriona')).toBeInTheDocument();
    expect(within(dialog).getByText('$18.000')).toBeInTheDocument();
    expect(within(dialog).queryByText('Con anfitriona')).toBeNull();
    expect(dialog).not.toHaveTextContent('$0');
  });
});
