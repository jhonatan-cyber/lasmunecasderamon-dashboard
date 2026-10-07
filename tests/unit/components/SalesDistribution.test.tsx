import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { SalesDistribution } from '@/components/sales/SalesDistribution';
afterEach(cleanup);
describe('reparto registrado en la venta', () => {
  it('muestra cada anfitriona con su monto y el total de comisión', () => {
    render(
      <SalesDistribution
        title='Comisiones'
        defaultRole='Anfitriona'
        rows={[
          { usuario_id: 'a', nick: 'Ana', monto: 20000 },
          { usuario_id: 'b', nick: 'María', monto: 40000 }
        ]}
      />
    );
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('María')).toBeInTheDocument();
    expect(screen.getAllByText('Anfitriona')).toHaveLength(2);
    expect(screen.getByText('$60.000')).toBeInTheDocument();
  });
  it('identifica a garzón, cajero y barman y respeta sus montos reales', () => {
    render(
      <SalesDistribution
        title='Propinas'
        rows={[
          { usuario_id: 'g', nombre: 'Luis', apellido: 'Pérez', rol: 'garzon', monto: 8000 },
          { usuario_id: 'c', nick: 'Caja', rol: 'cajero', monto: 4000 },
          { usuario_id: 'b', nick: 'Bar', rol: 'barman', monto: 4000 }
        ]}
      />
    );
    expect(screen.getByText('Luis Pérez')).toBeInTheDocument();
    for (const rol of ['Garzón', 'Cajero', 'Barman'])
      expect(screen.getByText(rol)).toBeInTheDocument();
    expect(screen.getByText('$16.000')).toBeInTheDocument();
  });
  it('informa cuando no hay reparto en vez de inventar valores', () => {
    render(<SalesDistribution title='Propinas' rows={[]} />);
    expect(screen.getByText('No hay reparto registrado para esta venta.')).toBeInTheDocument();
  });
});
