'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RoleForm } from '@/components/roles/RoleForm';
import { DeleteRoleConfirmModal } from '@/components/roles/DeleteRoleConfirmModal';
import { PermissionsPanel } from '@/components/roles/PermissionsPanel';
import type { Role } from '@/hooks/personal';

interface RolesDialogsProps {
  isAddRoleModalOpen: boolean;
  setIsAddRoleModalOpen: (open: boolean) => void;
  isEditMode: boolean;
  setIsEditMode: (edit: boolean) => void;
  editRoleId: number | null;
  setEditRoleId: (id: number | null) => void;
  newRole: { name: string; description: string };
  setNewRole: (role: { name: string; description: string }) => void;
  handleSubmitRole: (data: { name: string; description: string }) => void;
  isSubmitting: boolean;
  isConfirmModalOpen: boolean;
  setIsConfirmModalOpen: (open: boolean) => void;
  confirmAction: () => void;
  roleToAction: Role | null;
  modalAction: 'delete' | 'deactivate';
  isPermissionsModalOpen: boolean;
  setIsPermissionsModalOpen: (open: boolean) => void;
  selectedRole: Role | null;
}

export function RolesDialogs({
  isAddRoleModalOpen,
  setIsAddRoleModalOpen,
  isEditMode,
  setIsEditMode,
  editRoleId,
  setEditRoleId,
  newRole,
  setNewRole,
  handleSubmitRole,
  isSubmitting,
  isConfirmModalOpen,
  setIsConfirmModalOpen,
  confirmAction,
  roleToAction,
  modalAction,
  isPermissionsModalOpen,
  setIsPermissionsModalOpen,
  selectedRole
}: RolesDialogsProps) {
  const resetRoleForm = () => {
    setIsEditMode(false);
    setEditRoleId(null);
    setNewRole({ name: '', description: '' });
  };

  return (
    <>
      <Dialog
        open={isAddRoleModalOpen}
        onOpenChange={open => {
          setIsAddRoleModalOpen(open);
          if (!open) resetRoleForm();
        }}
      >
        <DialogContent className='w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px] max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
            <DialogTitle className='text-lg sm:text-xl lg:text-2xl'>
              {isEditMode ? 'Editar Rol' : 'Agregar Nuevo Rol'}
            </DialogTitle>
            <DialogDescription className='sr-only'>Formulario de rol</DialogDescription>
          </DialogHeader>
          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <RoleForm
              isEditMode={isEditMode}
              initialValues={newRole}
              open={isAddRoleModalOpen}
              isLoading={isSubmitting}
              onSubmit={handleSubmitRole}
              onCancel={resetRoleForm}
              hideButtons={true}
            />
          </div>
          <div className='shrink-0 border-t px-6 py-4'>
            <div className='flex flex-col sm:flex-row justify-center gap-2 w-full'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white w-full sm:w-auto'
                onClick={resetRoleForm}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                form='role-form'
                variant='outline'
                size='sm'
                className='bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200 w-full sm:w-auto'
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Guardando...' : isEditMode ? 'Guardar Cambios' : 'Guardar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <DeleteRoleConfirmModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        onConfirm={confirmAction}
        roleName={roleToAction?.name || ''}
        action={modalAction}
      />

      <Dialog open={isPermissionsModalOpen} onOpenChange={setIsPermissionsModalOpen}>
        <DialogContent className='w-[95vw] max-w-[95vw] sm:hidden h-[90vh] flex flex-col p-0 overflow-hidden'>
          <DialogHeader className='shrink-0 px-4 pt-4 pb-3 border-b'>
            <DialogTitle className='text-base font-semibold'>
              {selectedRole ? `Permisos del Rol: ${selectedRole.name}` : 'Permisos del Rol'}
            </DialogTitle>
            <DialogDescription className='sr-only'>
              Gestión de permisos del rol seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className='flex-1 min-h-0 overflow-hidden p-2'>
            <div className='h-full min-h-0 overflow-hidden bg-white dark:bg-neutral-900 rounded-lg'>
              <PermissionsPanel selectedRole={selectedRole} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
