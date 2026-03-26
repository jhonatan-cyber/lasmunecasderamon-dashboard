'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
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
    paginatedUsers,
    isLoading,
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
          if (value !== undefined && value !== null) {
            formData.append(key, String(value));
          }
        });

        let shouldGenerateEmail = true;
        if (isEditing && selectedUser) {
          shouldGenerateEmail = values.nick !== selectedUser.nick;
        }

        if (shouldGenerateEmail) {
          formData.set('correo', `${values.nick}@lasmuñecasderamon.com`);
        }
        formData.set('password', values.run);
        if (file) formData.append('foto', file);

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
    const user = paginatedUsers?.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
      setDeleteModalOpen(true);
    }
  }, [paginatedUsers]);

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
            <ExportButtons users={paginatedUsers || []} />
            <PermissionGuard module='users' action='create' fallback={null}>
              <Button onClick={() => { setSelectedUser(null); setIsEditing(false); setIsFormOpen(true); }}
                className='bg-black text-white rounded-full px-6 py-2'>
                <Plus className='w-4 h-4 mr-1' /> Nuevo Usuario
              </Button>
            </PermissionGuard>
          </div>
        </div>

        <UserFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} filterStatus={filterStatus}
          setFilterStatus={setFilterStatus} filterRole={filterRole} setFilterRole={setFilterRole}
          onClearFilters={handleClearFilters} pageSize={pageSize} setPageSize={setPageSize} setPage={setPage} />

        <div className='mt-6 overflow-x-auto'>
          <UserTable users={paginatedUsers} onViewDetails={handleViewDetails} onEdit={handleEditUser}
            onActivate={handleActivateUser} onDeactivate={handleDeactivateUser} onDelete={handleDeleteUser}
            formatCurrency={formatCurrency} formatDate={formatDate} getRoleBadgeColor={getRoleBadgeColor}
            currentPage={page} pageSize={pageSize} />
        </div>

        {totalPages > 1 && <div className='flex justify-center mt-6'><Paginate page={page} totalPages={totalPages} setPage={setPage} /></div>}

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className='max-w-2xl'>
            <DialogHeader><DialogTitle>Detalles</DialogTitle><DialogDescription className='sr-only'>Detalles</DialogDescription></DialogHeader>
            <div className='overflow-y-auto'>{selectedUser && <UserDetails user={selectedUser} />}</div>
          </DialogContent>
        </Dialog>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className='max-w-3xl'>
            <DialogHeader><DialogTitle>{isEditing ? 'Editar' : 'Nuevo'}</DialogTitle><DialogDescription className='sr-only'>Form</DialogDescription></DialogHeader>
            <div className='overflow-y-auto'>
              <UserForm user={selectedUser || undefined} onSubmit={handleFormSubmit} onCancel={handleFormCancel} isEditMode={isEditing} hideButtons={true} />
            </div>
            <div className='border-t p-4 flex justify-center gap-4'>
              <Button onClick={handleFormCancel} variant='outline' className='rounded-full'>Cancelar</Button>
              <Button type='submit' form='user-form' className='bg-black text-white rounded-full'>
                {isEditing ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <DeleteUserConfirmModal open={deleteModalOpen} onOpenChange={setDeleteModalOpen} onConfirm={handleConfirmDelete}
          userName={userToDelete ? `${userToDelete.name} ${userToDelete.lastName}` : ''} />
      </div>
    </PermissionGuard>
  );
}
