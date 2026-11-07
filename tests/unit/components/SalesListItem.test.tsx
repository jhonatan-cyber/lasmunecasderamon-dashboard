import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SalesListItem } from '@/components/sales/SalesListItem';
import type { VentaWithDetails } from '@/types/venta';

function renderSale(
  overrides: Partial<VentaWithDetails> = {},
  withPrintAction = false,
  onImprimir = () => {}
) {
  const venta: VentaWithDetails = {
    id: 'venta-1',
    codigo: 'V-1',
    cliente_id: null,
    habitacion_id: '',
    metodo_pago: 'efectivo',
    propina: 0,
    sub_total: 10000,
    total: 10000,
    fecha_crea: '2026-11-07T10:00:00',
    estado: 1,
    detalles: [],
    usuarios: [],
    ...overrides
  };
  return render(
    <SalesListItem
      venta={venta}
      index={0}
      statusLabels={{ 1: 'Completada' }}
      metodoPagoLabels={{ efectivo: 'Efectivo' }}
      anfitrionaColors={[]}
      formatCurrency={value => String(value)}
      canViewDetails={withPrintAction}
      canAnular={false}
      hasAnyAction={withPrintAction}
      onVerDetalles={() => {}}
      onImprimir={onImprimir}
      onAnularClick={() => {}}
    />
  );
}

describe('SalesListItem · origen', () => {
  it.each([
    ['pedido', 'Pedido'],
    ['servicio', 'Servicio'],
    ['entrada', 'Entrada'],
    ['barra', 'Barra']
  ] as const)('indica que la venta viene de %s', (origen, etiqueta) => {
    renderSale({ origen });
    expect(screen.getByText(`Origen: ${etiqueta}`)).toBeInTheDocument();
  });

  it('infiere el origen de pedido para ventas históricas sin origen explícito', () => {
    renderSale({ pedido_id: 'pedido-1' });
    expect(screen.getByText('Origen: Pedido')).toBeInTheDocument();
  });

  it('incluye una acción para imprimir el ticket', () => {
    const onImprimir = vi.fn();
    renderSale({}, true, onImprimir);

    fireEvent.click(screen.getByRole('button', { name: 'Imprimir ticket de venta' }));

    expect(onImprimir).toHaveBeenCalledOnce();
  });
});
