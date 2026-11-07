import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { OrderDetailInfoPanel } from '@/components/orders/OrderDetailInfoPanel';

describe('OrderDetailInfoPanel', () => {
  it('oculta filas sin datos', () => {
    render(
      <OrderDetailInfoPanel
        hasChampagneProducts={false}
        cantidadAnfitrionas={0}
        maxAnfitrionas={0}
      />
    );

    expect(screen.queryByText('Fecha y Hora:')).not.toBeInTheDocument();
    expect(screen.queryByText('Código:')).not.toBeInTheDocument();
    expect(screen.queryByText('Anfitriona(s):')).not.toBeInTheDocument();
    expect(screen.queryByText('Cliente:')).not.toBeInTheDocument();
    expect(screen.queryByText('Garzón:')).not.toBeInTheDocument();
  });

  it('conserva los datos disponibles y omite únicamente los campos vacíos', () => {
    render(
      <OrderDetailInfoPanel
        code='PED-1'
        clientName='María'
        hostessName=''
        hasChampagneProducts={false}
        cantidadAnfitrionas={0}
        maxAnfitrionas={0}
      />
    );

    expect(screen.getByText('Código:')).toBeInTheDocument();
    expect(screen.getByText('PED-1')).toBeInTheDocument();
    expect(screen.getByText('Cliente:')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.queryByText('Anfitriona(s):')).not.toBeInTheDocument();
  });
});
