﻿'use client';

import { useState, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';

import { useUsers } from '@/hooks/personal/useUsers';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserImage } from '@/contexts/UserImageContext';

import { User } from '@/types/user';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

import { UserTable } from '@/components/users/UserTable';
import { UserFilters } from '@/components/users/UserFilters';
import { type UserFormValues } from '@/hooks/personal/useUserForm';
import { ExportButtons } from '@/components/users/ExportButtons';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { UsersSkeleton } from '@/components/shared/Skeletons';
import dynamic from 'next/dynamic';

const UserDetailsModal = dynamic(
  () => import('@/components/users/UserDetailsModal').then(m => m.UserDetailsModal),
  { ssr: false }
);
const UserFormModal = dynamic(
  () => import('@/components/users/UserFormModal').then(m => m.UserFormModal),
  { ssr: false }
);
const DeleteUserConfirmModal = dynamic(
  () => import('@/components/users/DeleteUserConfirmModal').then(m => m.DeleteUserConfirmModal),
  { ssr: false }
);

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

  const handleActivateUser = useCallback(
    async (userId: string | number) => {
      const r = await activateUser(String(userId));
      if (r.success) toast.success('Activado');
      else toast.error(r.message || 'Error');
    },
    [activateUser]
  );

  const handleDeactivateUser = useCallback(
    async (userId: string | number) => {
      const r = await deactivateUser(String(userId));
      if (r.success) toast.success('Desactivado');
      else toast.error(r.message || 'Error');
    },
    [deactivateUser]
  );

  const handleDeleteUser = useCallback(
    (userId: string | number) => {
      const user = users?.find(u => u.id === userId);
      if (user) {
        setUserToDelete(user);
        setDeleteModalOpen(true);
      }
    },
    [users]
  );

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

  if (error) return <div>Error: {error}</div>;

  return (
    <div className='w-full max-w-none px-1 sm:px-3 lg:px-4 space-y-6 mt-4 pb-24 sm:pb-8'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6'>
        <div>
          <h1 className='text-3xl font-bold'>Gestión de Usuarios</h1>
          <p className='text-gray-600'>Control de plataforma.</p>
        </div>
        <div className='flex flex-col w-full sm:w-auto items-stretch sm:items-end gap-2'>
          <PermissionGuard module='users' action='view' fallback={null}>
            <div className='w-full sm:w-auto flex justify-center sm:justify-end'>
              <ExportButtons users={users || []} />
            </div>
          </PermissionGuard>
          <PermissionGuard module='users' action='create' fallback={null}>
            <Button
              onClick={() => {
                setSelectedUser(null);
                setIsEditing(false);
                setIsFormOpen(true);
              }}
              className='w-full sm:w-auto bg-black text-white rounded-full px-6 py-2 whitespace-nowrap inline-flex items-center justify-center hover:bg-white hover:text-black hover:scale-105 transition-all duration-200 border-2 dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white'
            >
              <Plus className='w-4 h-4 mr-1' /> Nuevo Usuario
            </Button>
          </PermissionGuard>
        </div>
      </div>

      <PermissionGuard module='users' action='view'>
        {isLoading ? (
          <UsersSkeleton />
        ) : (
          <>
            <UserFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              filterStatus={filterStatus}
              setFilterStatus={setFilterStatus}
              filterRole={filterRole}
              setFilterRole={setFilterRole}
              onClearFilters={handleClearFilters}
              pageSize={pageSize}
              setPageSize={setPageSize}
              setPage={setPage}
            />

            <div className='mt-6 lg:overflow-x-auto'>
              <UserTable
                users={users}
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

            {totalPages > 1 && (
              <div className='flex justify-center mt-6'>
                <Paginate page={page} totalPages={totalPages} setPage={setPage} />
              </div>
            )}
          </>
        )}

        <UserDetailsModal
          user={selectedUser}
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
        />

        <UserFormModal
          user={selectedUser}
          isOpen={isFormOpen}
          isEditing={isEditing}
          isMutating={isMutating}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
        />

        <DeleteUserConfirmModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={handleConfirmDelete}
          userName={userToDelete ? `${userToDelete.name} ${userToDelete.lastName}` : ''}
          isLoading={isMutating}
        />
      </PermissionGuard>
    </div>
  );
}
