import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountsPageClient } from '@/components/accounts/AccountsPageClient';
import { usePrepaidBalances } from '@/hooks/accounts/usePrepaidBalances';
import type { Client } from '@/types/client';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  openDetailsModal: vi.fn(),
  openPrepagoModal: vi.fn(),
  handlePrepagoSubmit: vi.fn()
}));

vi.mock('@/hooks/accounts/usePrepaidBalances', () => ({ usePrepaidBalances: vi.fn() }));
vi.mock('@/hooks/clients/useClientModals', () => ({
  useClientModals: () => ({
    isPrepagoModalOpen: false,
    setIsPrepagoModalOpen: vi.fn(),
    prepagoClient: null,
    prepagoAmount: '',
    setPrepagoAmount: vi.fn(),
    prepagoPaymentMethod: 'efectivo',
    setPrepagoPaymentMethod: vi.fn(),
    prepagoMixedPayments: [],
    setPrepagoMixedPayments: vi.fn(),
    prepagoBaucherFoto: null,
    setPrepagoBaucherFoto: vi.fn(),
    prepagoSubmitting: false,
    prepagoCajaCerrada: false,
    handlePrepagoSubmit: mocks.handlePrepagoSubmit,
    isDetailsOpen: false,
    setIsDetailsOpen: vi.fn(),
    selectedClient: null,
    openDetailsModal: mocks.openDetailsModal,
    openPrepagoModal: mocks.openPrepagoModal
  })
}));
vi.mock('@/components/auth/PermissionGuard', () => ({
  PermissionGuard: ({ children }: { children: ReactNode }) => <>{children}</>
}));

const clients: Client[] = [
  {
    id: 'client-1',
    name: 'Ana',
    lastName: 'Pérez',
    run: '12.345.678-9',
    phone: '5551234',
    saldo: 15000,
    status: 1
  }
];

function mockBalances() {
  vi.mocked(usePrepaidBalances).mockReturnValue({
    clients,
    total: 21,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: mocks.refetch
  } as ReturnType<typeof usePrepaidBalances>);
}

beforeEach(() => {
  vi.clearAllMocks();
  mockBalances();
});

afterEach(cleanup);

describe('AccountsPageClient', () => {
  it('busca, pagina y cambia el tamaño de página', async () => {
    render(<AccountsPageClient />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Buscar cliente' }), {
      target: { value: 'Ana' }
    });
    expect(usePrepaidBalances).toHaveBeenLastCalledWith({
      search: 'Ana',
      page: 1,
      pageSize: 10
    });

    fireEvent.click(screen.getByRole('link', { name: 'Página siguiente' }));
    expect(usePrepaidBalances).toHaveBeenLastCalledWith({
      search: 'Ana',
      page: 2,
      pageSize: 10
    });

    fireEvent.click(screen.getByRole('link', { name: 'Página anterior' }));
    expect(usePrepaidBalances).toHaveBeenLastCalledWith({
      search: 'Ana',
      page: 1,
      pageSize: 10
    });

    fireEvent.click(screen.getByRole('combobox', { name: 'Filas por página' }));
    fireEvent.click(await screen.findByRole('option', { name: '20' }));
    await waitFor(() =>
      expect(usePrepaidBalances).toHaveBeenLastCalledWith({
        search: 'Ana',
        page: 1,
        pageSize: 20
      })
    );
  });

  it('abre el detalle del cliente y permite iniciar una recarga', () => {
    render(<AccountsPageClient />);

    fireEvent.click(screen.getAllByRole('button', { name: 'Ver detalle' })[0]);
    expect(mocks.openDetailsModal).toHaveBeenCalledWith(clients[0]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Recargar saldo' })[0]);
    expect(mocks.openPrepagoModal).toHaveBeenCalledWith(clients[0]);
  });

  it('elimina el contador de clientes y deja la paginación centrada debajo de la tabla', () => {
    render(<AccountsPageClient />);

    expect(screen.queryByText(/cliente con saldo/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar saldos' })).not.toBeInTheDocument();

    const table = screen.getByRole('table');
    const pagination = screen.getByRole('navigation', { name: 'Paginación de saldos' });
    expect(
      table.compareDocumentPosition(pagination) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });
});
