import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { PendingApprovals } from '@/components/bar/PendingApprovals';
import { TransferSaleDetails } from '@/components/bar/TransferSaleDetails';
import type { TransferRecord } from '@/types/transfer';

afterEach(cleanup);

const baseRecord: TransferRecord = {
  id: 't2',
  producto_id: 'p1',
  producto_nombre: 'Whisky',
  presentacion_nombre: '750 ml',
  cantidad: 1,
  fecha_crea: '2026-10-12T10:00:00',
  usuario_nombre: 'Bodega',
  usuario_id: 'u1',
  estado: 'pendiente',
  aceptado_por: null,
  aceptado_nombre: null,
  fecha_aceptacion: null,
  precio_venta: 0,
  comision: 0
};

it('separa el precio con y sin anfitriona y deja la comisión vacía cuando es cero', () => {
  render(
    <TransferSaleDetails
      record={{
        ...baseRecord,
        opciones_venta: [
          { tipo: 'botella', precio: 30000, comision: 5000, precio_sin_anfitriona: 18000 }
        ]
      }}
    />
  );
  const detail = screen.getByLabelText('Detalle de venta enviado');
  expect(
    within(detail).getByRole('row', { name: 'Con anfitriona $30.000 $5.000' })
  ).toBeInTheDocument();
  expect(within(detail).getByRole('row', { name: 'Sin anfitriona $18.000 —' })).toBeInTheDocument();
});

it('sin venta con anfitriona muestra solo el precio sin anfitriona y sin comisión', () => {
  render(
    <TransferSaleDetails
      record={{
        ...baseRecord,
        opciones_venta: [{ tipo: 'botella', precio: 0, comision: 0, precio_sin_anfitriona: 18000 }]
      }}
    />
  );
  const detail = screen.getByLabelText('Detalle de venta enviado');
  expect(within(detail).queryByRole('row', { name: /Con anfitriona/ })).toBeNull();
  expect(within(detail).getByRole('row', { name: 'Sin anfitriona $18.000 —' })).toBeInTheDocument();
  expect(detail).toHaveTextContent('Máximo de anfitrionas0');
});

it('muestra al receptor precios, comisiones, medidas y bebidas antes de aprobar', () => {
  const record: TransferRecord = {
    id: 't1',
    producto_id: 'p1',
    producto_nombre: 'Whisky',
    presentacion_nombre: '750 ml',
    cantidad: 3,
    fecha_crea: '2026-10-12T10:00:00',
    usuario_nombre: 'Bodega',
    usuario_id: 'u1',
    estado: 'pendiente',
    aceptado_por: null,
    aceptado_nombre: null,
    fecha_aceptacion: null,
    precio_venta: 30000,
    comision: 5000,
    max_anfitrionas: 2,
    ml_shot: 50,
    ml_shot_anfitriona: 30,
    tiers: [{ anfitrionas: 2, precio: 40000, comision: 8000 }],
    opciones_venta: [
      { tipo: 'botella', precio: 30000, comision: 5000, acompanamiento: { unidades: 2 } },
      {
        tipo: 'shot',
        precio: 3000,
        comision: 0,
        ml_acompanamiento_cliente: 100,
        ml_acompanamiento_anfitriona: 80,
        precios_anfitriona: [
          { precio: 5000, comision: 1000 },
          { precio: 7000, comision: 2000 }
        ]
      }
    ]
  };
  render(
    <PendingApprovals
      pendientes={[record]}
      puedeAprobar
      resolvingId={null}
      loading={false}
      onResolve={vi.fn()}
    />
  );
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Whisky'));
  const dialog = screen.getByRole('dialog');
  const detail = within(dialog).getByLabelText('Detalle de venta enviado');
  expect(within(detail).getByRole('row', { name: 'Botella $30.000 $5.000' })).toBeInTheDocument();
  expect(
    within(detail).getByRole('row', { name: '2 anfitrionas $40.000 $8.000' })
  ).toBeInTheDocument();
  expect(detail).toHaveTextContent('2 unidades por botella');
  expect(
    within(detail).getByRole('row', { name: 'Corto anfitriona 2 $7.000 $2.000' })
  ).toBeInTheDocument();
  expect(detail).toHaveTextContent('Ml corto cliente50 ml');
  expect(detail).toHaveTextContent('Bebida clienteProducto completo');
  expect(detail).toHaveTextContent('Ml corto anfitriona30 ml');
  expect(detail).toHaveTextContent('Bebida anfitriona80 ml');
  expect(within(dialog).getByRole('button', { name: 'Aprobar' })).toBeEnabled();
});
