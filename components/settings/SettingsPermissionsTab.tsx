'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Key, Plus } from 'lucide-react';
import { toast } from 'sonner';
import Paginate from '@/components/shared/Paginate';
import { PermissionFilters } from '@/components/permissions/PermissionFilters';
import { PermissionStatsCards } from '@/components/permissions/PermissionStatsCards';
import { PermissionTable } from '@/components/permissions/PermissionTable';
import { PermissionModal } from '@/components/permissions/PermissionModal';
import type { Permission, PermissionFormData } from './settings-types';
import logger from '@/lib/utils/logger';

export function SettingsPermissionsTab() {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null);
  const [isSavingPermission, setIsSavingPermission] = useState(false);

  const fetchPermissions = useCallback(async () => {
    try {
      setPermissionsLoading(true);
      const response = await fetch('/api/permissions');
      if (!response.ok) throw new Error('Error al cargar permisos');
      const result = await response.json();
      const data = result.success ? result.data : result;
      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      logger.captureException(error, { context: 'SettingsPermissionsTab:fetch' });
      toast.error('Error al cargar los permisos');
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const availableModules = useMemo(() => {
    const modules = new Set(permissions.map(p => p.module));
    return Array.from(modules).sort();
  }, [permissions]);

  const filteredPermissions = useMemo(() => {
    let result = Array.isArray(permissions) ? [...permissions] : [];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        permission =>
          permission.name.toLowerCase().includes(search) ||
          permission.module.toLowerCase().includes(search) ||
          permission.action.toLowerCase().includes(search)
      );
    }

    if (moduleFilter !== 'all') {
      result = result.filter(permission => permission.module === moduleFilter);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'module':
          comparison = a.module.localeCompare(b.module);
          break;
        case 'action':
          comparison = a.action.localeCompare(b.action);
          break;
        case 'created_at':
          comparison = (a.created_at || '').localeCompare(b.created_at || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [permissions, searchTerm, moduleFilter, sortBy, sortOrder]);

  const paginatedPermissions = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredPermissions.slice(start, start + pageSize);
  }, [filteredPermissions, page, pageSize]);

  const totalPages = Math.ceil(filteredPermissions.length / pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, moduleFilter, sortBy, sortOrder, pageSize]);

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setModuleFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  }, []);

  const handleCreatePermission = () => {
    setEditingPermission(null);
    setIsPermissionModalOpen(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setEditingPermission(permission);
    setIsPermissionModalOpen(true);
  };

  const handleDeletePermission = async (permissionId: string) => {
    try {
      const response = await fetch(`/api/permissions/${permissionId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Error al eliminar permiso');
      const result = await response.json();
      if (result.success) {
        setPermissions(prev => prev.filter(p => String(p.id) !== permissionId));
        toast.success('Permiso eliminado correctamente');
      } else {
        throw new Error(result.message || 'Error al eliminar permiso');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsPermissionsTab:delete' });
      toast.error('Error al eliminar el permiso');
    }
  };

  const handlePermissionSave = async (permissionData: PermissionFormData) => {
    try {
      setIsSavingPermission(true);
      const url = editingPermission
        ? `/api/permissions/${editingPermission.id}`
        : '/api/permissions';
      const method = editingPermission ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(permissionData)
      });

      if (!response.ok) throw new Error('Error al guardar permiso');
      const result = await response.json();

      if (result.success) {
        if (editingPermission) {
          await fetchPermissions();
          toast.success('Permiso actualizado correctamente');
        } else {
          setPermissions(prev => [
            ...prev,
            { ...permissionData, id: result.id } as unknown as Permission
          ]);
          toast.success('Permiso creado correctamente');
        }
        setIsPermissionModalOpen(false);
        setEditingPermission(null);
      } else {
        throw new Error(result.message || 'Error al guardar permiso');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsPermissionsTab:save' });
      toast.error('Error al guardar el permiso');
    } finally {
      setIsSavingPermission(false);
    }
  };

  if (permissionsLoading) {
    return (
      <div className='text-center py-8'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto'></div>
        <p className='text-sm text-gray-600 mt-2'>Cargando...</p>
      </div>
    );
  }

  return (
    <div className='space-y-4 sm:space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
        <div>
          <h2 className='text-xl sm:text-2xl lg:text-3xl font-bold text-black dark:text-neutral-100'>
            Gestión de Permisos
          </h2>
          <p className='text-sm sm:text-base text-zinc-600 dark:text-neutral-300 mt-1'>
            Crea, edita y elimina permisos del sistema
          </p>
        </div>
        <button
          className='whitespace-nowrap inline-flex items-center px-6 py-2 bg-black text-white rounded-full hover:bg-white/90 hover:text-black dark:hover:bg-white dark:hover:text-black hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
          onClick={handleCreatePermission}
        >
          <Plus className='h-4 w-4 mr-2' />
          Nuevo Permiso
        </button>
      </div>

      <PermissionStatsCards permissions={permissions} />

      <PermissionFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        moduleFilter={moduleFilter}
        setModuleFilter={setModuleFilter}
        sortBy={sortBy}
        setSortBy={setSortBy}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        onClearFilters={handleClearFilters}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setPage={setPage}
        availableModules={availableModules}
      />

      {filteredPermissions.length === 0 ? (
        <div className='text-center py-8'>
          <Key className='h-8 w-8 sm:h-12 sm:w-12 text-zinc-400 mx-auto mb-4' />
          <h3 className='text-base sm:text-lg font-medium text-zinc-600 dark:text-neutral-300 mb-2'>
            No hay permisos configurados
          </h3>
          <p className='text-xs sm:text-sm text-zinc-500 dark:text-neutral-400 mb-4'>
            Crea el primer permiso del sistema
          </p>
          <button
            onClick={handleCreatePermission}
            className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors text-sm'
          >
            <Plus className='h-4 w-4 mr-2' />
            Crear Permiso
          </button>
        </div>
      ) : (
        <>
          <PermissionTable
            permissions={paginatedPermissions}
            loading={permissionsLoading}
            onEdit={handleEditPermission}
            onDelete={handleDeletePermission}
            currentPage={page}
            pageSize={pageSize}
          />
          {totalPages > 1 && (
            <div className='flex justify-center mt-4 sm:mt-6'>
              <Paginate page={page} totalPages={totalPages} setPage={setPage} />
            </div>
          )}
        </>
      )}

      <PermissionModal
        isOpen={isPermissionModalOpen}
        onOpenChange={setIsPermissionModalOpen}
        isEditMode={!!editingPermission}
        permissionData={editingPermission}
        onSubmit={handlePermissionSave}
        isLoading={isSavingPermission}
      />
    </div>
  );
}
