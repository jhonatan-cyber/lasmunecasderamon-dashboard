import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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

  it('muestra solo los mililitros servidos y la presentación del producto', () => {
    const onOpenChange = vi.fn();
    const venta: VentaWithDetails = {
      id: 'venta-2',
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
      consumos_inventario: [
        {
          nombre: 'Pepsi 2000 ml',
          unidades: 0,
          ml: 150,
          capacidad_ml: 2000
        },
        {
          nombre: 'Danta naranja 1500ml',
          unidades: 0,
          ml: 150,
          capacidad_ml: 1500
        },
        {
          nombre: 'Whisky 750 ml',
          unidades: 1,
          ml: 0,
          capacidad_ml: 750
        }
      ]
    };

    render(
      <SalesDetailModal
        open
        onOpenChange={onOpenChange}
        selectedVenta={venta}
        anfitrionaColors={[]}
        metodoPagoLabels={{ efectivo: 'Efectivo' }}
      />
    );

    expect(screen.getByText('150 ml servidos de 2000 ml')).toBeInTheDocument();
    expect(screen.getByText('150 ml servidos de 1500 ml')).toBeInTheDocument();
    expect(screen.getByText('1 unidad descontada')).toBeInTheDocument();
    expect(screen.queryByText(/botellas equivalentes/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
