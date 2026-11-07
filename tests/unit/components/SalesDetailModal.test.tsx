import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SalesDetailModal } from '@/components/sales/SalesDetailModal';
import type { VentaWithDetails } from '@/types/venta';

describe('SalesDetailModal · campos opcionales', () => {
  it('oculta metadatos sin datos en vez de mostrar guiones o textos de reemplazo', () => {
    const venta: VentaWithDetails = {
      id: 'venta-1',
      codigo: '',
      cliente_id: null,
      habitacion_id: '',
      metodo_pago: 'efectivo',
      propina: 0,
      sub_total: 10000,
      total: 10000,
      fecha_crea: '',
      estado: 1,
      detalles: [],
      usuarios: [],
      cliente_nombre: 'Sin cliente',
      anfitrionas_nicks: null
    };

    render(
      <SalesDetailModal
        open
        onOpenChange={() => {}}
        selectedVenta={venta}
        anfitrionaColors={[]}
        metodoPagoLabels={{ efectivo: 'Efectivo' }}
      />
    );

    expect(screen.queryByText('Fecha')).not.toBeInTheDocument();
    expect(screen.queryByText('Habitación')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente')).not.toBeInTheDocument();
    expect(screen.queryByText('Vendido por')).not.toBeInTheDocument();
    expect(screen.queryByText('Anfitrionas')).not.toBeInTheDocument();
    expect(screen.queryByText('Propina')).not.toBeInTheDocument();
    expect(screen.getByText('Total de venta')).toBeInTheDocument();
  });
});
