'use client';

import { useState, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import Paginate from '@/components/ui/paginate';

import { useUsers } from '@/hooks/personal/useUsers';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserImage } from '@/contexts/UserImageContext';

import { User } from '@/types/user';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

import { UserDetails } from '@/components/users/UserDetails';
import { UserTable } from '@/components/users/UserTable';
import { UserFilters } from '@/components/users/UserFilters';
import { UserForm, type UserFormValues } from '@/components/users/UserForm';
import { DeleteUserConfirmModal } from '@/components/users/DeleteUserConfirmModal';
import { ExportButtons } from '@/components/users/ExportButtons';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { UsersSkeleton } from '@/components/ui/skeletons';

export default function Users() {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const { user: currentUser, refetch: refetchCurrentUser } = useCurrentUser();
  const { updateImage } = useUserImage();

  const {
    users,
    isLoading,
    isMutating,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    filterRole,
    setFilterRole,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    createUser,
    updateUser,
    activateUser,
    deactivateUser,
    deleteUser
  } = useUsers();

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterRole('all');
    setPage(1);
  };

  const handleFormSubmit = useCallback(
    async (values: UserFormValues, file?: File) => {
      try {
        const formData = new FormData();
        Object.entries(values).forEach(([key, value]) => {
          if (value !== undefined && value !== null && key !== 'foto') {
            formData.append(key, String(value));
          }
        });
        if (file) {
          formData.set('foto', file);
        } else if (values.foto) {
          formData.set('foto', values.foto);
        }

        let shouldGenerateEmail = true;
        if (isEditing && selectedUser) {
          shouldGenerateEmail = values.nick !== selectedUser.nick;
        }

        if (shouldGenerateEmail) {
          formData.set('correo', `${values.nick}@lasmuñecasderamon.com`);
        }
        formData.set('password', values.run);

        if (isEditing && selectedUser) {
          const result = await updateUser(String(selectedUser.id), formData);
          if (result.success) {
            toast.success(result.message || 'Usuario actualizado');
            setIsFormOpen(false);
            setIsEditing(false);
            setSelectedUser(null);
            if (currentUser && selectedUser.id === currentUser.id) {
              updateImage();
              await refetchCurrentUser();
            }
          } else {
            toast.error(result.message || 'Error al actualizar');
          }
        } else {
          const result = await createUser(formData);
          if (result.success) {
            toast.success(result.message || 'Usuario creado');
            setIsFormOpen(false);
          } else {
            toast.error(result.message || 'Error al crear');
          }
        }
      } catch (e) {
        toast.error('Error al procesar la solicitud');
      }
    },
    [isEditing, selectedUser, createUser, updateUser, currentUser, updateImage, refetchCurrentUser]
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

  const handleActivateUser = useCallback(async (userId: string | number) => {
    const r = await activateUser(String(userId));
    if (r.success) toast.success('Activado');
    else toast.error(r.message || 'Error');
  }, [activateUser]);

  const handleDeactivateUser = useCallback(async (userId: string | number) => {
    const r = await deactivateUser(String(userId));
    if (r.success) toast.success('Desactivado');
    else toast.error(r.message || 'Error');
  }, [deactivateUser]);

  const handleDeleteUser = useCallback((userId: string | number) => {
    const user = users?.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setDeleteModalOpen(true);
    }
  }, [users]);

  const handleConfirmDelete = useCallback(async () => {
    if (!userToDelete) return;
    const r = await deleteUser(String(userToDelete.id));
    if (r.success) {
      toast.success('Eliminado');
      setDeleteModalOpen(false);
      setUserToDelete(null);
    } else toast.error(r.message || 'Error');
  }, [userToDelete, deleteUser]);

  const getRoleBadgeColor = useCallback((role: string): string => {
    const roleColors: Record<string, string> = {
      admin: 'bg-purple-100 text-purple-900',
      administrador: 'bg-purple-100 text-purple-900',
      garzon: 'bg-blue-100 text-blue-900',
      anfitriona: 'bg-red-100 text-red-900',
      cajero: 'bg-green-100 text-green-900',
      default: 'bg-gray-100 text-gray-900'
    };
    return roleColors[role?.toLowerCase()] || roleColors.default;
  }, []);

  if (isLoading) return <UsersSkeleton />;
  if (error) return <div>Error: {error}</div>;

  return (
    <PermissionGuard module='users' action='view'>
      <div className='p-4 sm:p-6 lg:p-10 space-y-6 mt-6'>
        <div className='flex flex-col sm:flex-row justify-between items-center gap-6'>
          <div>
            <h1 className='text-3xl font-bold'>Gestión de Usuarios</h1>
            <p className='text-gray-600'>Control de plataforma.</p>
          </div>
          <div className='flex gap-2 items-center'>
            <ExportButtons users={users || []} />
            <PermissionGuard module='users' action='create' fallback={null}>
              <Button onClick={() => { setSelectedUser(null); setIsEditing(false); setIsFormOpen(true); }}
                className='bg-black text-white rounded-full px-6 py-2 hover:bg-white/90 hover:text-black dark:hover:bg-white dark:hover:text-black hover:scale-105 transition-all duration-200'>
                <Plus className='w-4 h-4 mr-1' /> Nuevo Usuario
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <UserFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatus={filterStatus}
          setFilterStatus={setFilterStatus} filterRole={filterRole} setFilterRole={setFilterRole}
          onClearFilters={handleClearFilters} pageSize={pageSize} setPageSize={setPageSize} setPage={setPage} />

        <div className='mt-6 overflow-x-auto'>
          <UserTable users={users} onViewDetails={handleViewDetails} onEdit={handleEditUser}
            onActivate={handleActivateUser} onDeactivate={handleDeactivateUser} onDelete={handleDeleteUser}
            formatCurrency={formatCurrency} formatDate={formatDate} getRoleBadgeColor={getRoleBadgeColor}
            currentPage={page} pageSize={pageSize} />
        </div>

        {totalPages > 1 && <div className='flex justify-center mt-6'><Paginate page={page} totalPages={totalPages} setPage={setPage} /></div>}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className='max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden'>
            <DialogHeader className='p-6 border-b'>
              <DialogTitle className='text-xl font-bold'>Detalles del Usuario</DialogTitle>
              <DialogDescription className='sr-only'>Información detallada del usuario seleccionado</DialogDescription>
            </DialogHeader>
            <div className='flex-1 overflow-y-auto p-6'>
              {selectedUser && <UserDetails user={selectedUser} />}
            </div>
            <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center px-6 rounded-b-2xl'>
              <Button onClick={() => setIsDetailsOpen(false)} className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 transition-all hover:scale-105'>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className='max-w-3xl max-h-[90vh] flex flex-col p-0 overflow-hidden'>
            <DialogHeader className='p-6 pb-2 border-b'>
              <DialogTitle className='text-xl font-bold'>{isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
              <DialogDescription className='sr-only'>Formulario para crear o editar usuarios</DialogDescription>
            </DialogHeader>

            <div className='flex-1 overflow-y-auto p-6'>
              <UserForm user={selectedUser || undefined} onSubmit={handleFormSubmit} onCancel={handleFormCancel} isEditMode={isEditing} hideButtons={true} />
            </div>

            <div className='border-t p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center gap-3 px-6 rounded-b-2xl'>
              <Button onClick={handleFormCancel} variant='outline' className='rounded-full px-6 dark:hover:bg-white dark:hover:text-black transition-all hover:scale-105' disabled={isMutating}>
                Cancelar
              </Button>
              <Button type='submit' form='user-form' className='bg-black text-white dark:bg-white dark:text-black dark:hover:bg-gray-200 rounded-full px-8 hover:bg-gray-800 transition-all hover:scale-105' disabled={isMutating}>
                {isMutating ? (
                  <div className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    <span>{isEditing ? 'Actualizando...' : 'Guardando...'}</span>
                  </div>
                ) : (
                  <span>{isEditing ? 'Actualizar Cambios' : 'Guardar Usuario'}</span>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DeleteUserConfirmModal 
          open={deleteModalOpen} 
          onOpenChange={setDeleteModalOpen} 
          onConfirm={handleConfirmDelete}
          userName={userToDelete ? `${userToDelete.name} ${userToDelete.lastName}` : ''}
          isLoading={isMutating} 
        />
      </div>
    </PermissionGuard>
  );
}
