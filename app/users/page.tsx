'use client';

import { useState, useCallback } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';

import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { EMAIL_DOMAIN } from '@/lib/constants/email';

import { useUsers } from '@/hooks/personal';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserImage } from '@/contexts/UserImageContext';

import { User } from '@/types/user';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';

import { UserTable } from '@/components/users/UserTable';
import { UserFilters } from '@/components/users/UserFilters';
import { type UserFormValues } from '@/hooks/personal';
import { ExportButtons } from '@/components/users/ExportButtons';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
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
  () => import('@/components/shared/DeleteConfirmModal').then(m => m.DeleteConfirmModal),
  { ssr: false }
);
const EnrollBiometricDialog = dynamic(
  () => import('@/components/users/EnrollBiometricDialog').then(m => m.EnrollBiometricDialog),
  { ssr: false }
);

export default function Users() {
  const queryClient = useQueryClient();
  const [unenrollTarget, setUnenrollTarget] = useState<User | null>(null);
  const [unenrolling, setUnenrolling] = useState(false);
  const [unenrollError, setUnenrollError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [enrollTarget, setEnrollTarget] = useState<{
    id: string;
    nombre: string;
    codigo: string;
  } | null>(null);
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
            formData.append(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
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
          formData.set('correo', `${values.nick}${EMAIL_DOMAIN}`);
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

  // Enrolamiento en el lector: abre el diálogo que baja la cara/huella del equipo.
  const handleEnrollUser = useCallback((user: User) => {
    setEnrollTarget({
      id: String(user.id),
      nombre: `${user.name || ''} ${user.lastName || ''}`.trim(),
      codigo: user.biometrico_codigo || ''
    });
  }, []);

  const handleUnenrollUser = useCallback((user: User) => {
    setUnenrollError(null);
    setUnenrollTarget(user);
  }, []);

  async function confirmUnenroll() {
    if (!unenrollTarget || unenrolling) return;
    setUnenrolling(true);
    setUnenrollError(null);
    try {
      const response = await fetch(
        `/api/users/${encodeURIComponent(unenrollTarget.id)}/biometric`,
        {
          method: 'DELETE'
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'No se pudo desenrolar al usuario.');
      }
      toast.success(result.message);
      setUnenrollTarget(null);
    } catch (error) {
      setUnenrollError(error instanceof Error ? error.message : 'Error de conexión. Reintentá.');
    } finally {
      setUnenrolling(false);
      void queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  }

  const handleActivateUser = useCallback(
    async (userId: string | number) => {
      const r = await activateUser(String(userId));
      if (r.success) {
        toast.success(r.message || 'Activado');
      } else toast.error(r.message || 'Error');
    },
    [activateUser]
  );

  const handleDeactivateUser = useCallback(
    async (userId: string | number) => {
      const r = await deactivateUser(String(userId));
      if (r.success) {
        toast.success(r.message || 'Desactivado');
      } else toast.error(r.message || 'Error');
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
      default: 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
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
        <BoneyardSkeleton name='users-main' loading={isLoading}>
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
              onEnroll={handleEnrollUser}
              onUnenroll={handleUnenrollUser}
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
        </BoneyardSkeleton>

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
          entityLabel='usuario'
          entityValue={userToDelete ? `${userToDelete.name} ${userToDelete.lastName}` : ''}
          fieldName='Usuario'
          isLoading={isMutating}
        />

        <AlertDialog
          open={Boolean(unenrollTarget)}
          onOpenChange={open => {
            if (!open && !unenrolling) setUnenrollTarget(null);
          }}
        >
          <AlertDialogContent aria-busy={unenrolling}>
            <AlertDialogHeader>
              <AlertDialogTitle>Desenrolar usuario</AlertDialogTitle>
              <AlertDialogDescription>
                Se eliminarán las plantillas de cara y huella de {unenrollTarget?.name}{' '}
                {unenrollTarget?.lastName} de la base de datos del sistema. Su cuenta, foto de
                perfil e historial se conservarán. Para el reconocimiento facial deberá enrolarse
                nuevamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {unenrollError && (
              <p role='alert' className='text-sm text-destructive'>
                {unenrollError}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={unenrolling}>Cancelar</AlertDialogCancel>
              <Button variant='destructive' disabled={unenrolling} onClick={confirmUnenroll}>
                {unenrolling && <Loader2 className='size-4 animate-spin' />}
                {unenrolling ? 'Desenrolando…' : unenrollError ? 'Reintentar' : 'Desenrolar'}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {enrollTarget && (
          <EnrollBiometricDialog
            open
            onOpenChange={open => {
              if (!open) setEnrollTarget(null);
            }}
            userId={enrollTarget.id}
            nombre={enrollTarget.nombre}
            codigo={enrollTarget.codigo}
            onSaved={() => {
              void queryClient.invalidateQueries({ queryKey: ['users'] });
            }}
          />
        )}
      </PermissionGuard>
    </div>
  );
}
