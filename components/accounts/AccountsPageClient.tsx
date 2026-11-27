'use client';
import { useState } from 'react';
import { ClientDetailsModal } from '@/components/clients/ClientDetailsModal';
import { PrepagoModal } from '@/components/clients/PrepagoModal';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious
} from '@/components/ui/pagination';
import { PrepaidBalanceTable } from '@/components/accounts/tables/PrepaidBalanceTable';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { usePrepaidBalances } from '@/hooks/accounts/usePrepaidBalances';
import { useClientModals } from '@/hooks/clients/useClientModals';
import { cn } from '@/lib/utils/utils';

export function AccountsPageClient() {
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);
  const { clients, total, isLoading, error, refetch } = usePrepaidBalances({
    search: searchTerm.trim(),
    page,
    pageSize
  });
  const {
    isPrepagoModalOpen,
    setIsPrepagoModalOpen,
    prepagoClient,
    prepagoAmount,
    setPrepagoAmount,
    prepagoPaymentMethod,
    setPrepagoPaymentMethod,
    prepagoMixedPayments,
    setPrepagoMixedPayments,
    prepagoBaucherFoto,
    setPrepagoBaucherFoto,
    prepagoSubmitting,
    prepagoCajaCerrada,
    handlePrepagoSubmit,
    isDetailsOpen,
    setIsDetailsOpen,
    selectedClient,
    closeDetailsModal,
    openDetailsModal,
    openPrepagoModal
  } = useClientModals();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleDetailsModalChange = (open: boolean) => {
    if (open) setIsDetailsOpen(true);
    else closeDetailsModal();
  };

  return (
    <PermissionGuard module='accounts' action='view'>
      <div className='flex flex-col gap-6 p-4 sm:p-6 lg:p-8'>
        <header>
          <h1 className='text-xl font-bold text-foreground sm:text-2xl lg:text-3xl'>Cuentas</h1>
          <p className='mt-1 text-sm text-muted-foreground sm:text-base'>
            Consulta el saldo prepago disponible de cada cliente.
          </p>
        </header>

        <Card className='border-border bg-card shadow-sm'>
          <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:p-5'>
            <div className='min-w-0 flex-1'>
              <Label htmlFor='account-client-search'>Buscar cliente</Label>
              <Input
                id='account-client-search'
                type='search'
                value={searchTerm}
                onChange={event => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder='Nombre, RUT o teléfono'
                className='mt-2 min-h-11'
              />
            </div>

            <div className='w-full sm:w-32'>
              <Label htmlFor='account-page-size'>Filas por página</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(value: string) => {
                  setPageSize(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger id='account-page-size' className='mt-2 min-h-11'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='10'>10</SelectItem>
                  <SelectItem value='20'>20</SelectItem>
                  <SelectItem value='50'>50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <PrepaidBalanceTable
          clients={clients}
          isLoading={isLoading}
          error={error}
          onRetry={() => void refetch()}
          onOpenDetails={openDetailsModal}
          onRecharge={openPrepagoModal}
        />

        {totalPages > 1 && (
          <Pagination aria-label='Paginación de saldos' className='pt-2'>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href='#'
                  aria-label='Página anterior'
                  aria-disabled={page === 1 || isLoading}
                  tabIndex={page === 1 || isLoading ? -1 : 0}
                  className={cn((page === 1 || isLoading) && 'pointer-events-none opacity-50')}
                  onClick={event => {
                    event.preventDefault();
                    if (page > 1) setPage(current => current - 1);
                  }}
                />
              </PaginationItem>
              <PaginationItem>
                <span className='px-3 text-sm text-muted-foreground' aria-live='polite'>
                  Página {page} de {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href='#'
                  aria-label='Página siguiente'
                  aria-disabled={page === totalPages || isLoading}
                  tabIndex={page === totalPages || isLoading ? -1 : 0}
                  className={cn(
                    (page === totalPages || isLoading) && 'pointer-events-none opacity-50'
                  )}
                  onClick={event => {
                    event.preventDefault();
                    if (page < totalPages) setPage(current => current + 1);
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}

        <ClientDetailsModal
          isOpen={isDetailsOpen}
          onOpenChange={handleDetailsModalChange}
          client={selectedClient}
        />
        <PrepagoModal
          isOpen={isPrepagoModalOpen}
          onOpenChange={setIsPrepagoModalOpen}
          client={prepagoClient}
          amount={prepagoAmount}
          onAmountChange={setPrepagoAmount}
          paymentMethod={prepagoPaymentMethod}
          onPaymentMethodChange={setPrepagoPaymentMethod}
          mixedPayments={prepagoMixedPayments}
          onMixedPaymentsChange={setPrepagoMixedPayments}
          baucherFoto={prepagoBaucherFoto}
          onBaucherFotoChange={setPrepagoBaucherFoto}
          onSubmit={event =>
            handlePrepagoSubmit(event, () => {
              void refetch();
            })
          }
          isSubmitting={prepagoSubmitting}
          cajaCerrada={prepagoCajaCerrada}
        />
      </div>
    </PermissionGuard>
  );
}
