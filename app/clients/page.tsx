'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useClients } from '@/hooks/clientes/useClients';
import { Client } from '@/types/client';
import { ClientModal } from '@/components/clients/ClientModal';
import { ClientDetails } from '@/components/clients/ClientDetails';
import { toast } from 'sonner';
import { ClientTable } from '@/components/clients/ClientTable';
import { ClientFilters } from '@/components/clients/ClientFilters';
import { ExportButtons } from '@/components/clients/ExportButtons';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { ClientsSkeleton } from '@/components/ui/skeletons';
import { PrepagoModal } from '@/components/clients/PrepagoModal';

export default function Clients() {
  const {
    clients,
    allClients,
    isLoading,
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus(null);
    setPage(1);
  };

  const handleAddClient = async (data: {
    run: string;
    name: string;
    lastName: string;
    phone: string;
  }) => {
    try {
      await createClient(data);
      setIsModalOpen(false);
      setModalClientData(CLIENT_EMPTY);
      toast.success('Cliente creado correctamente');
    } catch (error) {
      toast.error('Error al crear el cliente');
    }
  };

  const handleEditClient = async (data: {
    run: string;
    name: string;
    lastName: string;
    phone: string;
  }) => {
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
    } catch (error) {
      toast.error('Error al actualizar el cliente');
    }
  };

  const handleDeleteClient = async (client: Client) => {
    try {
      await deleteClient(client.id);
      toast.success('Cliente eliminado correctamente');
    } catch (error) {
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

  const handleEditFromDetails = () => {
    if (!selectedClient) return;
    setIsDetailsOpen(false);
    handleEditClick(selectedClient);
  };

  const handleLoadPrepago = (client: Client) => {
    setPrepagoClient(client);
    setIsPrepagoModalOpen(true);
  };

  if (isLoading) return <ClientsSkeleton />;

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
              <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogTrigger asChild>
                  <Button
                    onClick={handleAddClick}
                    size='sm'
                    variant='outline'
                    className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base px-4 sm:px-6 py-2 w-full sm:w-auto'
                  >
                    <Plus className='w-3 h-3 sm:w-4 sm:h-4 mr-1' />
                    Nuevo Cliente
                  </Button>
                </DialogTrigger>
                <ClientModal
                  open={isModalOpen}
                  onOpenChange={setIsModalOpen}
                  isEditMode={isEditMode}
                  clientData={modalClientData}
                  setClientData={setModalClientData}
                  isLoading={isLoading}
                  onSubmit={isEditMode ? handleEditClient : handleAddClient}
                  onCancel={() => {
                    setIsModalOpen(false);
                    setModalClientData(CLIENT_EMPTY);
                    setIsEditMode(false);
                    setEditClientId(null);
                  }}
                />
              </Dialog>
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

        {/* Diálogo de detalles del cliente */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className='max-w-6xl w-[95vw] sm:w-[90vw] h-fit max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden'>
            <DialogHeader>
              <DialogTitle className='text-lg sm:text-xl'>Detalles del Cliente</DialogTitle>
            </DialogHeader>
            {selectedClient && (
              <ClientDetails
                client={selectedClient}
                onClose={() => setIsDetailsOpen(false)}
              />
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
        <PrepagoModal
          open={isPrepagoModalOpen}
          onOpenChange={setIsPrepagoModalOpen}
          client={prepagoClient}
          onSuccess={() => fetchClients()}
        />
      </div>
    </PermissionGuard>
  );
}
