import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PrepaidBalanceTable } from '@/components/accounts/tables/PrepaidBalanceTable';

const client = {
  id: 'client-1',
  name: 'Ana',
  lastName: 'Pérez',
  run: '12.345.678-9',
  phone: '5551234',
  saldo: 15000,
  status: 1
};

describe('PrepaidBalanceTable', () => {
  it('muestra el saldo prepago del cliente en la tabla', () => {
    const onOpenDetails = vi.fn();
    const onRecharge = vi.fn();
    render(
      <PrepaidBalanceTable
        clients={[client]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onOpenDetails={onOpenDetails}
        onRecharge={onRecharge}
      />
    );

    expect(screen.getAllByText('Ana Pérez')).toHaveLength(2);
    expect(screen.getAllByText(/15\.000/)).toHaveLength(2);
    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalle' })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: 'Recargar saldo' })[0]);
    expect(onOpenDetails).toHaveBeenCalledWith(client);
    expect(onRecharge).toHaveBeenCalledWith(client);
  });

  it('indica cuando los saldos todavía se están cargando', () => {
    render(
      <PrepaidBalanceTable
        clients={[]}
        isLoading
        error={null}
        onRetry={vi.fn()}
        onOpenDetails={vi.fn()}
        onRecharge={vi.fn()}
      />
    );

    expect(screen.getByRole('status', { name: 'Cargando saldos prepago' })).toBeInTheDocument();
  });

  it('presenta un error y permite reintentar', () => {
    const onRetry = vi.fn();
    render(
      <PrepaidBalanceTable
        clients={[]}
        isLoading={false}
        error='No se pudieron cargar los saldos'
        onRetry={onRetry}
        onOpenDetails={vi.fn()}
        onRecharge={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los saldos');
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('comunica un estado vacío cuando no hay clientes que mostrar', () => {
    render(
      <PrepaidBalanceTable
        clients={[]}
        isLoading={false}
        error={null}
        onRetry={vi.fn()}
        onOpenDetails={vi.fn()}
        onRecharge={vi.fn()}
      />
    );

    expect(screen.getByText('No hay cuentas prepago para mostrar')).toBeInTheDocument();
  });
});
