'use client';

import { Key, Plus } from 'lucide-react';
import Paginate from '@/components/shared/Paginate';
import { PermissionFilters } from '@/components/permissions/PermissionFilters';
import { PermissionStatsCards } from '@/components/permissions/PermissionStatsCards';
import { PermissionTable } from '@/components/permissions/PermissionTable';
import type { Permission } from './settings-types';

interface SettingsPermissionsTabProps {
  permissions: Permission[];
  permissionsLoading: boolean;
  filteredPermissions: Permission[];
  paginatedPermissions: Permission[];
  totalPages: number;
  page: number;
  setPage: (page: number) => void;
  pageSize: number;
  setPageSize: (pageSize: number) => void;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  moduleFilter: string;
  setModuleFilter: (value: string) => void;
  sortBy: string;
  setSortBy: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  setSortOrder: (value: 'asc' | 'desc') => void;
  availableModules: string[];
  onClearFilters: () => void;
  onCreatePermission: () => void;
  onEditPermission: (permission: Permission) => void;
  onDeletePermission: (permissionId: string) => void;
}

export function SettingsPermissionsTab({
  permissions,
  permissionsLoading,
  filteredPermissions,
  paginatedPermissions,
  totalPages,
  page,
  setPage,
  pageSize,
  setPageSize,
  searchTerm,
  setSearchTerm,
  moduleFilter,
  setModuleFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  availableModules,
  onClearFilters,
  onCreatePermission,
  onEditPermission,
  onDeletePermission
}: SettingsPermissionsTabProps) {
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
          onClick={onCreatePermission}
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
        onClearFilters={onClearFilters}
        pageSize={pageSize}
        setPageSize={setPageSize}
        setPage={setPage}
        availableModules={availableModules}
      />

      {permissionsLoading ? (
        <div className='text-center py-8'>
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto'></div>
          <p className='text-sm text-gray-600 mt-2'>Cargando permisos...</p>
        </div>
      ) : filteredPermissions.length === 0 ? (
        <div className='text-center py-8'>
          <Key className='h-8 w-8 sm:h-12 sm:w-12 text-zinc-400 mx-auto mb-4' />
          <h3 className='text-base sm:text-lg font-medium text-zinc-600 dark:text-neutral-300 mb-2'>
            No hay permisos configurados
          </h3>
          <p className='text-xs sm:text-sm text-zinc-500 dark:text-neutral-400 mb-4'>
            Crea el primer permiso del sistema
          </p>
          <button
            onClick={onCreatePermission}
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
            onEdit={onEditPermission}
            onDelete={onDeletePermission}
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
    </div>
  );
}
