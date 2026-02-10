'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useUsers } from '@/hooks/personal/useUsers';
import { User } from '@/types/user';
import { UserDetails } from '@/components/users/UserDetails';
import { UserTable } from '@/components/users/UserTable';
import { UserFilters } from '@/components/users/UserFilters';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { DeleteUserConfirmModal } from '@/components/users/DeleteUserConfirmModal';
import { ExportButtons } from '@/components/users/ExportButtons';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatCurrency, formatDate } from '@/lib/formatters';
import Paginate from '@/components/ui/paginate';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function Users() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);


  const {
    paginatedUsers,
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    fetchUsers,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser
  } = useUsers();

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setPage(1);
  };

  const handleFormSubmit = useCallback(
    async (values: UserFormValues, file?: File) => {
      try {
        const formData = new FormData();

        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
    
          }
        });

        // Generar correo solo si es creación o si el nick cambió en edición
        let shouldGenerateEmail = true;
        if (isEditing && selectedUser) {
          // Solo generar nuevo correo si el nick cambió
          shouldGenerateEmail = values.nick !== selectedUser.nick;
    
        }

        if (shouldGenerateEmail) {
          const correo = `${values.nick}@lasmuñecasderamon.com`;
          formData.set('correo', correo);
                  // Correo generado
      } else {
        // No se genera nuevo correo - nick no cambió
      }

        formData.set('password', values.run);
  

        if (file) {
          formData.append('foto', file);
  
        }

        if (isEditing && selectedUser) {
                  const result = await updateUser(selectedUser.id, formData);
                            if (result.success) {
            toast.success(result.message || 'Usuario actualizado exitosamente');
            setIsFormOpen(false);
            setIsEditing(false);
            setSelectedUser(null);
            fetchUsers();
          } else {
            toast.error(result.message || 'Error al actualizar usuario');
          }
        } else {
                  const result = await createUser(formData);
          if (result.success) {
            toast.success(result.message || 'Usuario creado exitosamente');
            setIsFormOpen(false);
            fetchUsers();
          } else {
            toast.error(result.message || 'Error al crear usuario');
          }
        }
      } catch (error) {
        console.error('Error en handleFormSubmit:', error);
        toast.error('Error al procesar la solicitud');
      }
    },
    [isEditing, selectedUser, createUser, updateUser, fetchUsers]
  );

  const handleFormCancel = useCallback(() => {
    setIsFormOpen(false);
    setIsEditing(false);
    setSelectedUser(null);
  }, []);

  const handleViewDetails = useCallback((user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  }, []);

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditing(true);
    setIsFormOpen(true);
  }, []);

  const handleActivateUser = useCallback(async (userId: number) => {
    try {
      const result = await activateUser(userId);
      if (result.success) {
        toast.success('Usuario activado exitosamente');
        fetchUsers();
      } else {
        toast.error(result.message || 'Error al activar usuario');
      }
    } catch (error) {
      console.error('Error al activar usuario:', error);
      toast.error('Error al activar usuario');
    }
  }, [activateUser, fetchUsers]);

  const handleDeactivateUser = useCallback(async (userId: number) => {
    try {
      const result = await deactivateUser(userId);
      if (result.success) {
        toast.success('Usuario desactivado exitosamente');
        fetchUsers();
      } else {
        toast.error(result.message || 'Error al desactivar usuario');
      }
    } catch (error) {
      console.error('Error al desactivar usuario:', error);
      toast.error('Error al desactivar usuario');
    }
  }, [deactivateUser, fetchUsers]);

  const handleDeleteUser = useCallback((userId: number) => {
    const user = paginatedUsers?.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setDeleteModalOpen(true);
    }
  }, [paginatedUsers]);

  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return;

    try {
      const result = await deleteUser(userToDelete.id);
      if (result.success) {
        toast.success('Usuario eliminado exitosamente');
        setDeleteModalOpen(false);
        setUserToDelete(null);
        fetchUsers();
      } else {
        toast.error(result.message || 'Error al eliminar usuario');
      }
    } catch (error) {
      console.error('Error al eliminar usuario:', error);
      toast.error('Error al eliminar usuario');
    }
  }, [userToDelete, deleteUser, fetchUsers]);

  const getRoleBadgeColor = useCallback((role: string): string => {
    const roleColors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
      administrador: 'bg-purple-100 text-purple-900 hover:bg-purple-200',
      garzon: 'bg-blue-100 text-blue-900 hover:bg-blue-200',
      anfitriona: 'bg-red-100 text-red-900 hover:bg-red-200',
      cajero: 'bg-green-100 text-green-900 hover:bg-green-200',
      default: 'bg-gray-100 text-gray-900 hover:bg-gray-200'
    };

    const normalizedRole = role?.toLowerCase().trim() || 'default';
    return roleColors[normalizedRole] || roleColors['default'];
  }, []);

  if (isLoading) return <div>Cargando usuarios...</div>;
  if (error) return <div>Error al cargar los usuarios: {error}</div>;

  return (
    <PermissionGuard module="users" action="listar">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-4 sm:mb-6'>
          <div className='flex flex-col'>
            <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold'>Gestión de Usuarios</h1>
            <p className='text-sm sm:text-base text-gray-600'>Gestiona todos los usuarios de la plataforma.</p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 items-stretch sm:items-center'>
            <ExportButtons users={paginatedUsers || []} />

            <PermissionGuard module="users" action="crear" fallback={null}>
              <Button
                onClick={() => {
                  setSelectedUser(null);
                  setIsEditing(false);
                  setIsFormOpen(true);
                }}
                size='sm'
                variant='outline'
                className='whitespace-nowrap inline-flex items-center bg-black text-white rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto px-4 sm:px-6 py-2'
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                Nuevo Usuario
              </Button>
            </PermissionGuard>
          </div>
        </div>

      <UserFilters
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
          <UserTable
            users={paginatedUsers}
            onViewDetails={handleViewDetails}
            onEdit={handleEditUser}
            onActivate={handleActivateUser}
            onDeactivate={handleDeactivateUser}
            onDelete={handleDeleteUser}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getRoleBadgeColor={getRoleBadgeColor}
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

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-2xl max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
            <DialogTitle className='text-lg sm:text-xl'>Detalles del Usuario</DialogTitle>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            {selectedUser && (
              <UserDetails
                user={selectedUser}
                onEdit={() => {
                  setIsDetailsOpen(false);
                  handleEditUser(selectedUser);
                }}
                onClose={() => setIsDetailsOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-3xl max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
            <DialogTitle className='text-lg sm:text-xl'>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <UserForm
              user={selectedUser || undefined}
              onSubmit={handleFormSubmit}
              onCancel={handleFormCancel}
              isEditMode={isEditing}
              hideButtons={true}
            />
          </div>
          <div className='flex-shrink-0 border-t px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 w-full'>
              <Button
                type='button'
                size='default'
                className='flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-sm sm:text-base w-full sm:w-auto'
                variant='outline'
                onClick={handleFormCancel}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='user-form'
                size='default'
                className='flex items-center bg-black text-white gap-2 rounded-full hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
                variant='outline'
              >
                {isEditing ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <PermissionGuard module="users" action="eliminar" fallback={null}>
        <DeleteUserConfirmModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={handleConfirmDelete}
          userName={userToDelete ? `${userToDelete.name} ${userToDelete.lastName}` : ''}
        />
      </PermissionGuard>
    </div>
  </PermissionGuard>
);
}
