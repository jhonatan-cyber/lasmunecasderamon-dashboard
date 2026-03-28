'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Plus, Wallet, Loader2 } from 'lucide-react';
import { useClients } from '@/hooks/clientes/useClients';
import { Client } from '@/types/client';
import { ClientForm } from '@/components/clients/ClientForm';
import { ClientDetails } from '@/components/clients/ClientDetails';
import { toast } from 'sonner';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ExportButtons } from '@/components/clients/ExportButtons';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ClientsSkeleton } from '@/components/ui/skeletons';
import { PrepagoForm } from '@/components/clients/PrepagoForm';
import { usePrepagoForm } from '@/hooks/personal/usePrepagoForm';
import { type ClientFormValues } from '@/hooks/personal/useClientForm';

const CLIENT_EMPTY = { run: '', name: '', lastName: '', phone: '' };

export default function Clients() {
  const {
    clients,
    allClients,
    isLoading,
    isMutating,
    createClient,
    updateClient,
    deleteClient,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    fetchClients
  } = useClients();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [modalClientData, setModalClientData] = useState(CLIENT_EMPTY);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClientId, setEditClientId] = useState<string | number | null>(null);
  const [isPrepagoModalOpen, setIsPrepagoModalOpen] = useState(false);
  const [prepagoClient, setPrepagoClient] = useState<Client | null>(null);
  const [prepagoSubmitting, setPrepagoSubmitting] = useState(false);

  const { 
    amount: prepagoAmount, 
    setAmount: setPrepagoAmount,
    numericAmount
  } = usePrepagoForm({
    client: prepagoClient,
    onSubmit: () => {}
  });

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
  }, [setSearchTerm, setFilterStatus, setPage]);

  const handleAddClient = useCallback(async (data: ClientFormValues) => {
    try {
      await createClient(data);
      setIsModalOpen(false);
      setModalClientData(CLIENT_EMPTY);
      toast.success('Cliente creado correctamente');
    } catch {
      toast.error('Error al crear el cliente');
    }
  }, [createClient]);

  const handleEditClient = useCallback(async (data: ClientFormValues) => {
    if (editClientId === null) return;
    try {
      await updateClient({
        id: editClientId,
        ...data
      });
      setIsModalOpen(false);
      setIsEditMode(false);
      setEditClientId(null);
      setModalClientData(CLIENT_EMPTY);
      toast.success('Cliente actualizado correctamente');
    } catch {
      toast.error('Error al actualizar el cliente');
    }
  }, [editClientId, updateClient]);

  const handleDeleteClient = useCallback(async (client: Client) => {
    try {
      await deleteClient(client.id);
      toast.success('Cliente eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el cliente');
    }
  }, [deleteClient]);

  const handleViewDetails = useCallback((client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  }, []);

  const handleEditClick = useCallback((client: Client) => {
    setModalClientData({
      run: client.run || '',
      name: client.name || '',
      lastName: client.lastName || '',
      phone: client.phone || ''
    });
    setEditClientId(client.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  }, []);

  const handleAddClick = useCallback(() => {
    setModalClientData(CLIENT_EMPTY);
    setEditClientId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  }, []);

  const handleLoadPrepago = useCallback((client: Client) => {
    setPrepagoClient(client);
    setPrepagoAmount('');
    setIsPrepagoModalOpen(true);
  }, [setPrepagoAmount]);

  const handlePrepagoSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepagoClient || !prepagoAmount) return;
    setPrepagoSubmitting(true);
    try {
      const response = await fetch('/api/clients/prepago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: prepagoClient.id,
          monto: numericAmount,
          tipo: 'CARGA'
        })
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Saldo cargado correctamente');
        setPrepagoAmount('');
        setIsPrepagoModalOpen(false);
        fetchClients();
      } else {
        toast.error(data.message || 'Error al cargar saldo');
      }
    } catch {
      toast.error('Error al procesar la solicitud');
    } finally {
      setPrepagoSubmitting(false);
    }
  }, [prepagoClient, prepagoAmount, setPrepagoAmount, fetchClients]);

  if (isLoading && allClients.length === 0) return <ClientsSkeleton />;

  return (
    <PermissionGuard module='clients' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div className='flex flex-col'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Clientes</h1>
            <p className='text-sm sm:text-base text-gray-600'>
              Gestiona todos los clientes de la plataforma.
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <ExportButtons clients={allClients || []} />
            <PermissionGuard module='clients' action='create' fallback={null}>
              <Button
                onClick={handleAddClick}
                size='sm'
                variant='outline'
                className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
              >
                <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                Nuevo Cliente
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <ClientFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          onClearFilters={handleClearFilters}
          pageSize={pageSize}
          setPageSize={setPageSize}
          setPage={setPage}
        />
        <div className='mt-4 sm:mt-6'>
          <div className='overflow-x-auto'>
            <ClientTable
              clients={clients}
              onEdit={handleEditClick}
              onDelete={handleDeleteClient}
              onViewDetails={handleViewDetails}
              onLoadPrepago={handleLoadPrepago}
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

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
            <DialogHeader className='p-6 pb-2 border-b'>
              <DialogTitle className='text-xl font-bold'>
                {isEditMode ? 'Editar Cliente' : 'Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                {isEditMode ? 'Formulario para editar cliente' : 'Formulario para crear nuevo cliente'}
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-6'>
              <ClientForm
                clientData={modalClientData}
                open={isModalOpen}
                onSubmit={isEditMode ? handleEditClient : handleAddClient}
                onCancel={() => {
                  setIsModalOpen(false);
                  setModalClientData(CLIENT_EMPTY);
                  setIsEditMode(false);
                  setEditClientId(null);
                }}
                isEditMode={isEditMode}
                isLoading={isMutating}
                hideButtons={true}
              />
            </div>

            <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
              <Button
                variant='outline'
                onClick={() => {
                  setIsModalOpen(false);
                  setModalClientData(CLIENT_EMPTY);
                  setIsEditMode(false);
                  setEditClientId(null);
                }}
                className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                disabled={isMutating}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='client-form'
                className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
                disabled={isMutating}
              >
                {isMutating ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>{isEditMode ? 'Actualizando...' : 'Guardando...'}</span>
                  </div>
                ) : (
                  <span>{isEditMode ? 'Actualizar Cambios' : 'Guardar Cliente'}</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Diálogo de detalles del cliente */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className='max-w-6xl w-[95vw] sm:w-[90vw] h-fit max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden'>
            <DialogHeader>
              <DialogTitle className='text-lg sm:text-xl'>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <ClientDetails client={selectedClient} onClose={() => setIsDetailsOpen(false)} />
            )}
            <div className='border-t pt-4 mt-2 bg-gray-50 dark:bg-slate-900/50 -m-4 sm:-m-6 p-4 sm:p-6 rounded-b-xl flex justify-center w-full'>
              <Button
                variant='outline'
                onClick={() => setIsDetailsOpen(false)}
                className='rounded-full w-full sm:w-auto px-8 py-2 dark:hover:bg-white dark:hover:text-black hover:scale-105 transition-all'
              >
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isPrepagoModalOpen} onOpenChange={setIsPrepagoModalOpen}>
          <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl'>
            <DialogHeader className='p-6 pb-2 border-b'>
              <DialogTitle className='text-xl font-bold flex items-center gap-2'>
                <Wallet className='w-5 h-5 text-green-600' />
                <span>Cargar Saldo Prepago</span>
              </DialogTitle>
              <DialogDescription className='sr-only'>
                Formulario para cargar saldo al cliente
              </DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-6'>
              <PrepagoForm
                client={prepagoClient}
                amount={prepagoAmount}
                onAmountChange={setPrepagoAmount}
                onSubmit={handlePrepagoSubmit}
                onCancel={() => setIsPrepagoModalOpen(false)}
                isSubmitting={prepagoSubmitting}
                hideButtons={true}
              />
            </div>

            <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
              <Button
                variant='outline'
                onClick={() => setIsPrepagoModalOpen(false)}
                className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105'
                disabled={prepagoSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='prepago-form'
                className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105'
                disabled={prepagoSubmitting || !prepagoAmount}
              >
                {prepagoSubmitting ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>Cargando...</span>
                  </div>
                ) : (
                  <span>Confirmar Recarga</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
