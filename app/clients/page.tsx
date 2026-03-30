'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useClients } from '@/hooks/clientes/useClients';
import { Client } from '@/types/client';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ClientHeader } from '@/components/clients/ClientHeader';
import { ClientModals } from '@/components/clients/ClientModals';
import { ClientStatsCards } from '@/components/clients/ClientStatsCards';
import { useClientModals } from '@/hooks/clients/useClientModals';
import Paginate from '@/components/shared/Paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ClientsSkeleton } from '@/components/shared/Skeletons';
import { type ClientFormValues } from '@/hooks/personal/useClientForm';

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
    // Form Modal State
    isModalOpen: isFormModalOpen,
    setIsModalOpen,
    isEditMode,
    modalClientData,
    editClientId,
    closeFormModal,

    // Details Modal State
    isDetailsOpen: isDetailsModalOpen,
    setIsDetailsOpen,
    selectedClient,
    closeDetailsModal,

    // Prepago Modal State
    isPrepagoModalOpen,
    setIsPrepagoModalOpen,
    prepagoClient,
    prepagoAmount,
    setPrepagoAmount,
    prepagoSubmitting,
    closePrepagoModal,

    // Actions
    openCreateModal,
    openEditModal,
    openDetailsModal,
    openPrepagoModal,
    handlePrepagoSubmit,
  } = useClientModals();

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
  }, [setSearchTerm, setFilterStatus, setPage]);

  const handleDeleteClient = useCallback(async (client: Client) => {
    try {
      await deleteClient(client.id);
      toast.success('Cliente eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el cliente');
    }
  }, [deleteClient]);

  if (isLoading && allClients.length === 0) return <ClientsSkeleton />;

  return (
    <PermissionGuard module='clients' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <ClientHeader
          allClients={allClients}
          onCreateClick={openCreateModal}
        />

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
          // Form Modal Props
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

          // Details Modal Props
          isDetailsModalOpen={isDetailsModalOpen}
          onDetailsModalChange={setIsDetailsOpen}
          selectedClient={selectedClient}

          // Prepago Modal Props
          isPrepagoModalOpen={isPrepagoModalOpen}
          onPrepagoModalChange={setIsPrepagoModalOpen}
          prepagoClient={prepagoClient}
          prepagoAmount={prepagoAmount}
          onPrepagoAmountChange={setPrepagoAmount}
          onPrepagoSubmit={(e) => handlePrepagoSubmit(e, updateClientSaldo)}
          isPrepagoSubmitting={prepagoSubmitting}
        />
      </div>
    </PermissionGuard>
  );
}
