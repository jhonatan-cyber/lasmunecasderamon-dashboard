'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useClients } from '@/hooks/clientes/useClients';
import { useRefreshOnFocus } from '@/hooks/shared';
import { Client } from '@/types/client';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ClientHeader } from '@/components/clients/ClientHeader';
import { ClientModals } from '@/components/clients/ClientModals';
import { ClientStatsCards } from '@/components/clients/ClientStatsCards';
import { useClientModals } from '@/hooks/clientes/useClientModals';
import Paginate from '@/components/shared/Paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { type ClientFormValues } from '@/hooks/personal';
import { useAuth } from '@/contexts/AuthContext';

export default function Clients() {
  const {
    clients,
    allClients,
    isLoading,
    isMutating,
    createClient,
    updateClient,
    deleteClient,
    updateClientSaldo,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    fetchClients
  } = useClients();

  const {
    isModalOpen: isFormModalOpen,
    setIsModalOpen,
    isEditMode,
    modalClientData,
    editClientId,
    closeFormModal,

    isDetailsOpen: isDetailsModalOpen,
    setIsDetailsOpen,
    selectedClient,
    closeDetailsModal,

    isPrepagoModalOpen,
    setIsPrepagoModalOpen,
    prepagoClient,
    prepagoAmount,
    setPrepagoAmount,
    prepagoPaymentMethod,
    setPrepagoPaymentMethod,
    prepagoMixedPayments,
    setPrepagoMixedPayments,
    prepagoSubmitting,
    prepagoCajaCerrada,
    closePrepagoModal,

    isDevolucionModalOpen,
    setIsDevolucionModalOpen,
    devolucionClient,
    devolucionAmount,
    setDevolucionAmount,
    devolucionPaymentMethod,
    setDevolucionPaymentMethod,
    devolucionMotivo,
    setDevolucionMotivo,
    devolucionSubmitting,
    closeDevolucionModal,

    openCreateModal,
    openEditModal,
    openDetailsModal,
    openPrepagoModal,
    handlePrepagoSubmit,
    openDevolucionModal,
    handleDevolucionSubmit
  } = useClientModals();

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
  }, [setSearchTerm, setFilterStatus, setPage]);

  const handleDeleteClient = useCallback(
    async (client: Client) => {
      try {
        await deleteClient(client.id);
        toast.success('Cliente eliminado correctamente');
      } catch {
        toast.error('Error al eliminar el cliente');
      }
    },
    [deleteClient]
  );

  const { user } = useAuth();
  const isAdmin = user?.role?.toLowerCase() === 'administrador';

  useRefreshOnFocus(fetchClients);

  return (
    <PermissionGuard module='clients' action='view'>
      <BoneyardSkeleton name='clients-main' loading={isLoading && allClients.length === 0}>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <ClientHeader allClients={allClients} onCreateClick={openCreateModal} />

          <div className='px-4 sm:px-8'>
            <ClientStatsCards clients={allClients || []} />
          </div>

          <ClientFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            onClearFilters={handleClearFilters}
            pageSize={pageSize}
            setPageSize={setPageSize}
            setPage={setPage}
            showSolicitudes={isAdmin}
          />

          <div className='mt-4 sm:mt-6'>
            <div className='overflow-x-auto'>
              <ClientTable
                clients={clients}
                loading={isLoading || isMutating}
                onEdit={openEditModal}
                onDelete={handleDeleteClient}
                onViewDetails={openDetailsModal}
                onLoadPrepago={openPrepagoModal}
                onDevolucion={openDevolucionModal}
                currentPage={page}
                pageSize={pageSize}
                isMutating={isMutating}
              />
            </div>
          </div>

          {totalPages > 1 && (
            <div className='flex justify-center mt-4 sm:mt-6'>
              <Paginate page={page} totalPages={totalPages} setPage={setPage} />
            </div>
          )}

          <ClientModals
            isFormModalOpen={isFormModalOpen}
            onFormModalChange={setIsModalOpen}
            isEditMode={isEditMode}
            clientData={modalClientData}
            onFormSubmit={async (data: ClientFormValues) => {
              try {
                if (isEditMode && editClientId) {
                  await updateClient({ id: editClientId, ...data });
                  toast.success('Cliente actualizado correctamente');
                } else {
                  await createClient(data);
                  toast.success('Cliente creado correctamente');
                }
                closeFormModal();
              } catch {
                toast.error('Error al guardar el cliente');
              }
            }}
            onFormCancel={closeFormModal}
            isFormLoading={isMutating}
            isDetailsModalOpen={isDetailsModalOpen}
            onDetailsModalChange={setIsDetailsOpen}
            selectedClient={selectedClient}
            isPrepagoModalOpen={isPrepagoModalOpen}
            onPrepagoModalChange={setIsPrepagoModalOpen}
            prepagoClient={prepagoClient}
            prepagoAmount={prepagoAmount}
            onPrepagoAmountChange={setPrepagoAmount}
            prepagoPaymentMethod={prepagoPaymentMethod}
            onPrepagoPaymentMethodChange={setPrepagoPaymentMethod}
            prepagoMixedPayments={prepagoMixedPayments}
            onPrepagoMixedPaymentsChange={setPrepagoMixedPayments}
            onPrepagoSubmit={e => handlePrepagoSubmit(e, updateClientSaldo)}
            isPrepagoSubmitting={prepagoSubmitting}
            prepagoCajaCerrada={prepagoCajaCerrada}
            isDevolucionModalOpen={isDevolucionModalOpen}
            onDevolucionModalChange={setIsDevolucionModalOpen}
            devolucionClient={devolucionClient}
            devolucionAmount={devolucionAmount}
            onDevolucionAmountChange={setDevolucionAmount}
            devolucionPaymentMethod={devolucionPaymentMethod}
            onDevolucionPaymentMethodChange={setDevolucionPaymentMethod}
            devolucionMotivo={devolucionMotivo}
            onDevolucionMotivoChange={setDevolucionMotivo}
            onDevolucionSubmit={e => handleDevolucionSubmit(e, updateClientSaldo)}
            isDevolucionSubmitting={devolucionSubmitting}
          />
        </div>
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
