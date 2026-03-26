'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
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
  const CLIENT_EMPTY = { run: '', name: '', lastName: '', phone: '' };
  const [modalClientData, setModalClientData] = useState(CLIENT_EMPTY);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [editClientId, setEditClientId] = useState<string | number | null>(null);
  const [isPrepagoModalOpen, setIsPrepagoModalOpen] = useState(false);
  const [prepagoClient, setPrepagoClient] = useState<Client | null>(null);
  const [prepagoSubmitting, setPrepagoSubmitting] = useState(false);
  const { amount: prepagoAmount, setAmount: setPrepagoAmount } = usePrepagoForm({
    client: prepagoClient,
    onSubmit: () => {}
  });

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
  };

  const handleAddClient = async (data: ClientFormValues) => {
    try {
      await createClient(data);
      setIsModalOpen(false);
      setModalClientData(CLIENT_EMPTY);
      toast.success('Cliente creado correctamente');
    } catch {
      toast.error('Error al crear el cliente');
    }
  };
  const handleEditClient = async (data: ClientFormValues) => {
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
  };

  const handleDeleteClient = async (client: Client) => {
    try {
      await deleteClient(client.id);
      toast.success('Cliente eliminado correctamente');
    } catch {
      toast.error('Error al eliminar el cliente');
    }
  };

  const handleViewDetails = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleEditClick = (client: Client) => {
    setModalClientData({
      run: client.run || '',
      name: client.name || '',
      lastName: client.lastName || '',
      phone: client.phone || ''
    });
    setEditClientId(client.id);
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const handleAddClick = () => {
    setModalClientData(CLIENT_EMPTY);
    setEditClientId(null);
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const handleLoadPrepago = (client: Client) => {
    setPrepagoClient(client);
    setPrepagoAmount('');
    setIsPrepagoModalOpen(true);
  };

  const handlePrepagoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepagoClient || !prepagoAmount) return;
    setPrepagoSubmitting(true);
    try {
      const response = await fetch('/api/clients/prepago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: prepagoClient.id,
          monto: parseInt(prepagoAmount),
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
  };

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
            />
          </div>
        </div>

        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}

        {/* Diálogo de formulario cliente */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-md max-h-[90vh] flex flex-col p-0'>
            <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
              <DialogTitle className='text-lg sm:text-xl'>
                {isEditMode ? 'Editar Cliente' : 'Agregar Nuevo Cliente'}
              </DialogTitle>
              <DialogDescription className='sr-only'>
                {isEditMode
                  ? 'Formulario para editar cliente'
                  : 'Formulario para crear nuevo cliente'}
              </DialogDescription>
            </DialogHeader>
            <div className='flex-1 overflow-y-auto px-6 py-4'>
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
            <div className='flex-shrink-0 border-t px-6 py-4'>
              <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto px-6 py-2'
                  onClick={() => {
                    setIsModalOpen(false);
                    setModalClientData(CLIENT_EMPTY);
                    setIsEditMode(false);
                    setEditClientId(null);
                  }}
                  disabled={isMutating}
                >
                  Cancelar
                </Button>
                <Button
                  type='submit'
                  form='client-form'
                  size='sm'
                  variant='outline'
                  className='bg-black text-white rounded-full hover:scale-105 transition-all duration-200 w-full sm:w-auto px-6 py-2'
                  disabled={isMutating}
                >
                  {isMutating ? 'Guardando...' : isEditMode ? 'Actualizar' : 'Guardar'}
                </Button>
              </div>
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
            <DialogFooter className='border-t pt-4 mt-2'>
              <Button
                variant='outline'
                onClick={() => setIsDetailsOpen(false)}
                className='rounded-full w-full sm:w-auto px-8 py-2'
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Prepago */}
        <Dialog open={isPrepagoModalOpen} onOpenChange={setIsPrepagoModalOpen}>
          <DialogContent className='sm:max-w-[425px]'>
            <DialogHeader>
              <DialogTitle>Cargar Saldo Prepago</DialogTitle>
              <DialogDescription className='sr-only'>
                Formulario de carga de saldo
              </DialogDescription>
            </DialogHeader>
            <PrepagoForm
              client={prepagoClient}
              amount={prepagoAmount}
              onAmountChange={setPrepagoAmount}
              onSubmit={handlePrepagoSubmit}
              onCancel={() => setIsPrepagoModalOpen(false)}
              isSubmitting={prepagoSubmitting}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
