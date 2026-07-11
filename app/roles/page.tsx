'use client';

import { useState, useEffect, useCallback } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useRoles, Role } from '@/hooks/personal';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { RolesDialogs } from '@/components/roles/RolesDialogs';
import { RolesContent } from '@/components/roles/RolesContent';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import logger from '@/lib/utils/logger';

export default function RolesPage() {
  const {
    roles,
    isLoading,
    fetchRoles,
    createRole,
    updateRole,
    deactivateRole,
    activateRole,
    deleteRole
  } = useRoles();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<number | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAddRoleModalOpen, setIsAddRoleModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editRoleId, setEditRoleId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [roleToAction, setRoleToAction] = useState<Role | null>(null);
  const [modalAction, setModalAction] = useState<'delete' | 'deactivate'>('delete');
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const setupRolesTable = useCallback(async () => {
    try {
      const response = await fetch('/api/roles/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        showSuccessToast('Tabla de roles configurada correctamente');
        await fetchRoles();
      } else showErrorToast(result.message || 'Error al configurar roles');
    } catch {
      showErrorToast('Error al configurar la tabla de roles');
    }
  }, [fetchRoles]);

  const handleSubmitRole = useCallback(
    async (data: { name: string; description: string }) => {
      if (isSubmitting) return;
      logger.info('[ROLES PAGE] handleSubmitRole', data);
      try {
        setIsSubmitting(true);
        if (isEditMode && editRoleId) {
          await updateRole(editRoleId, data.name, data.description);
          showSuccessToast('Rol actualizado correctamente');
        } else {
          await createRole(data);
          showSuccessToast('Rol creado correctamente');
        }
        setIsAddRoleModalOpen(false);
        setIsEditMode(false);
        setEditRoleId(null);
        setNewRole({ name: '', description: '' });
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Error al guardar el rol');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, isEditMode, editRoleId, updateRole, createRole]
  );

  const handleEditRole = useCallback((role: Role) => {
    setIsEditMode(true);
    setEditRoleId(role.id);
    setNewRole({ name: role.name, description: role.description });
    setIsAddRoleModalOpen(true);
  }, []);

  const handleActivateRole = useCallback(
    async (roleId: number) => {
      try {
        await activateRole(roleId);
        showSuccessToast('Rol activado correctamente');
      } catch (error) {
        showErrorToast(error instanceof Error ? error.message : 'Error al activar el rol');
      }
    },
    [activateRole]
  );

  const handleDeleteRole = useCallback((role: Role) => {
    setRoleToAction(role);
    setModalAction('delete');
    setIsConfirmModalOpen(true);
  }, []);

  const handleDeactivateRole = useCallback((role: Role) => {
    setRoleToAction(role);
    setModalAction('deactivate');
    setIsConfirmModalOpen(true);
  }, []);

  const confirmAction = useCallback(async () => {
    if (!roleToAction) return;
    try {
      if (modalAction === 'delete') {
        await deleteRole(roleToAction.id);
        showSuccessToast('Rol eliminado correctamente');
      } else {
        await deactivateRole(roleToAction.id);
        showSuccessToast('Rol desactivado correctamente');
      }
      setRoleToAction(null);
    } catch (error) {
      showErrorToast(
        error instanceof Error
          ? error.message
          : `Error al ${modalAction === 'delete' ? 'eliminar' : 'desactivar'} el rol`
      );
    }
  }, [roleToAction, modalAction, deleteRole, deactivateRole]);

  const handleNewRole = useCallback(() => {
    setIsAddRoleModalOpen(true);
    setIsEditMode(false);
    setEditRoleId(null);
    setNewRole({ name: '', description: '' });
  }, []);

  const handleViewPermissions = useCallback((role: Role) => {
    setSelectedRole(role);
    setIsPermissionsModalOpen(true);
  }, []);

  return (
    <PermissionGuard module='roles' action='view'>
      <TooltipProvider>
        <RolesDialogs
          isAddRoleModalOpen={isAddRoleModalOpen}
          setIsAddRoleModalOpen={setIsAddRoleModalOpen}
          isEditMode={isEditMode}
          setIsEditMode={setIsEditMode}
          editRoleId={editRoleId}
          setEditRoleId={setEditRoleId}
          newRole={newRole}
          setNewRole={setNewRole}
          handleSubmitRole={handleSubmitRole}
          isSubmitting={isSubmitting}
          isConfirmModalOpen={isConfirmModalOpen}
          setIsConfirmModalOpen={setIsConfirmModalOpen}
          confirmAction={confirmAction}
          roleToAction={roleToAction}
          modalAction={modalAction}
          isPermissionsModalOpen={isPermissionsModalOpen}
          setIsPermissionsModalOpen={setIsPermissionsModalOpen}
          selectedRole={selectedRole}
        />
        <RolesContent
          roles={roles}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          selectedRole={selectedRole}
          setSelectedRole={setSelectedRole}
          onViewPermissions={handleViewPermissions}
          onEdit={handleEditRole}
          onDeactivate={handleDeactivateRole}
          onActivate={handleActivateRole}
          onDelete={handleDeleteRole}
          onSetupRoles={setupRolesTable}
          onNewRole={handleNewRole}
        />
      </TooltipProvider>
    </PermissionGuard>
  );
}
