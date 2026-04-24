'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Database, Key, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { ClientsSkeleton } from '@/components/shared/Skeletons';
import type { Permission } from '@/components/permissions/PermissionTable';
import dynamic from 'next/dynamic';
import { SettingsCompanyTab } from '@/components/settings/SettingsCompanyTab';
import { SettingsBillingTab } from '@/components/settings/SettingsBillingTab';
import { SettingsPermissionsTab } from '@/components/settings/SettingsPermissionsTab';
import { SettingsMaintenanceTab } from '@/components/settings/SettingsMaintenanceTab';
import { SettingsLogsTab } from '@/components/settings/SettingsLogsTab';
import type {
  BackupItem,
  BillingConfig,
  CompanyConfig,
  PermissionFormData,
  SystemConfig
} from '@/components/settings/settings-types';

const PermissionModal = dynamic(
  () => import('@/components/permissions/PermissionModal').then(mod => mod.PermissionModal),
  { ssr: false }
);

const CleanDatabaseConfirmModal = dynamic(
  () =>
    import('@/components/settings/CleanDatabaseConfirmModal').then(
      mod => mod.CleanDatabaseConfirmModal
    ),
  { ssr: false }
);

export default function Settings() {
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
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig>({
    empresa_nombre: '',
    empresa_rut: '',
    empresa_direccion: '',
    empresa_telefono: '',
    empresa_email: '',
    empresa_facebook: '',
    empresa_instagram: '',
    empresa_whatsapp: '',
    empresa_tiktok: ''
  });
  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    impuesto_iva: '19',
    impuesto_propina: '10',
    moneda: 'CLP',
    facturacion_activada: true,
    resolucion_sii: ''
  });
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    ambiente: 'produccion',
    timezone: 'America/Santiago'
  });
  const [configLoading, setConfigLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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
        default:
          comparison = 0;
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

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setModuleFilter('all');
    setSortBy('name');
    setSortOrder('asc');
    setPage(1);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, moduleFilter, sortBy, sortOrder, pageSize]);

  useEffect(() => {
    fetchPermissions();
    fetchCompanyConfig();
    fetchBackups();
  }, []);

  const fetchCompanyConfig = async () => {
    try {
      setConfigLoading(true);
      const response = await fetch('/api/configurations');
      const result = await response.json();

      if (result.success && result.data) {
        if (result.data.empresa) {
          setCompanyConfig(prev => ({ ...prev, ...result.data.empresa }));
        }
        if (result.data.facturacion) {
          setBillingConfig(prev => ({ ...prev, ...result.data.facturacion }));
        }
        if (result.data.sistema) {
          setSystemConfig(prev => ({ ...prev, ...result.data.sistema }));
        }
      }
    } catch (error) {
      console.error('Error fetching company config:', error);
    } finally {
      setConfigLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      setBackupsLoading(true);
      const response = await fetch('/api/settings/backup');
      const result = await response.json();

      if (result.success) {
        setBackups(result.backups || []);
      }
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setBackupsLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `backup_${new Date().toISOString().split('T')[0].replace(/-/g, '-')}`,
          descripcion: 'Backup manual antes de vaciar base de datos'
        })
      });
      const result = await response.json();

      if (result.success) {
        toast.success('Backup creado correctamente');
        await fetchBackups();
      } else {
        throw new Error(result.error || 'Error al crear backup');
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Error al crear el backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres restaurar este backup?\n\nSe sobrescribirán todos los datos actuales.'
      )
    ) {
      return;
    }

    if (!confirm('¿REALMENTE quieres continuar? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      setRestoringBackupId(backupId);
      const response = await fetch(`/api/settings/backup/${backupId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore' })
      });
      const result = await response.json();

      if (result.success) {
        toast.success(`Backup restaurado: ${result.restored.registros} registros`);
      } else {
        throw new Error(result.error || 'Error al restaurar backup');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      toast.error('Error al restaurar el backup');
    } finally {
      setRestoringBackupId(null);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      const response = await fetch(`/api/settings/backup/${backupId}/download`);
      if (!response.ok) throw new Error('Error al descargar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${backupId}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success('Backup descargado correctamente');
    } catch (error) {
      console.error('Error downloading backup:', error);
      toast.error('Error al descargar el backup');
    }
  };

  const saveCompanyConfig = async () => {
    try {
      setIsSavingConfig(true);

      for (const [key, value] of Object.entries(companyConfig)) {
        await fetch('/api/configurations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clave: key, valor: value })
        });
      }

      for (const [key, value] of Object.entries(billingConfig)) {
        await fetch('/api/configurations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clave: key, valor: String(value) })
        });
      }

      for (const [key, value] of Object.entries(systemConfig)) {
        await fetch('/api/configurations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clave: key, valor: value })
        });
      }

      toast.success('Configuración guardada correctamente');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Error al guardar la configuración');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const cleanDatabase = async () => {
    const createAutomaticBackup = async () => {
      try {
        const response = await fetch('/api/settings/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: `backup_auto_${new Date().toISOString().split('T')[0].replace(/-/g, '-')}`,
            descripcion: 'Backup automático antes de vaciar base de datos'
          })
        });
        const result = await response.json();
        if (result.success) {
          await fetchBackups();
          return result.backup;
        }
      } catch (error) {
        console.error('Error creating automatic backup:', error);
      }
      return null;
    };

    if (
      !confirm(
        '¿Estás seguro de que quieres VACIAR la base de datos?\n\nSe eliminará TODO excepto:\n- Usuarios\n- Roles\n- Permisos\n- Configuraciones\n\nEsta acción no se puede deshacer.'
      )
    ) {
      return;
    }

    if (
      !confirm(
        '¿REALMENTE quieres continuar?\n\nSe perderán TODOS los datos de ventas, pedidos, productos, clientes, etc.\n\nSe creará un backup automático antes de vaciar.'
      )
    ) {
      return;
    }

    try {
      setIsCleaning(true);
      await createAutomaticBackup();

      const response = await fetch('/api/settings/database-clean', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        toast.success(`Base de datos limpiada. ${result.deletedCount} tablas vaciadas.`);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      console.error('Error cleaning database:', error);
      toast.error('Error al limpiar la base de datos');
    } finally {
      setIsCleaning(false);
      setIsCleanModalOpen(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setPermissionsLoading(true);
      const response = await fetch('/api/permissions');
      if (!response.ok) throw new Error('Error al cargar permisos');
      const result = await response.json();
      const data = result.success ? result.data : result;
      setPermissions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
      toast.error('Error al cargar los permisos');
      setPermissions([]);
    } finally {
      setPermissionsLoading(false);
    }
  };

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
      const response = await fetch(`/api/permissions/${permissionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error al eliminar permiso');
      const result = await response.json();

      if (result.success) {
        setPermissions(prev => prev.filter(p => String(p.id) !== permissionId));
        toast.success('Permiso eliminado correctamente');
      } else {
        throw new Error(result.message || 'Error al eliminar permiso');
      }
    } catch (error) {
      console.error('Error deleting permission:', error);
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
          const newPermission = { ...permissionData, id: result.id };
          setPermissions(prev => [...prev, newPermission as Permission]);
          toast.success('Permiso creado correctamente');
        }

        setIsPermissionModalOpen(false);
        setEditingPermission(null);
      } else {
        throw new Error(result.message || 'Error al guardar permiso');
      }
    } catch (error) {
      console.error('Error saving permission:', error);
      toast.error('Error al guardar el permiso');
    } finally {
      setIsSavingPermission(false);
    }
  };

  if (permissionsLoading) return <ClientsSkeleton />;

  return (
    <div className='w-full max-w-none p-4 sm:p-6 lg:p-8'>
      <Tabs defaultValue='empresa' className='w-full space-y-6'>
        <TabsList className='flex w-full flex-wrap justify-start gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full'>
          <TabsTrigger value='empresa' className='flex items-center gap-2 rounded-full'>
            <Building2 className='h-4 w-4' />
            Empresa
          </TabsTrigger>
          <TabsTrigger value='facturacion' className='flex items-center gap-2 rounded-full'>
            <SettingsIcon className='h-4 w-4' />
            Facturación
          </TabsTrigger>
          <TabsTrigger value='permisos' className='flex items-center gap-2 rounded-full'>
            <Key className='h-4 w-4' />
            Permisos
          </TabsTrigger>
          <TabsTrigger value='mantenimiento' className='flex items-center gap-2 rounded-full'>
            <Database className='h-4 w-4' />
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger value='logs' className='flex items-center gap-2 rounded-full'>
            <ShieldAlert className='h-4 w-4' />
            Logs
          </TabsTrigger>
        </TabsList>

        <TabsContent value='empresa' className='space-y-6'>
          <SettingsCompanyTab
            configLoading={configLoading}
            companyConfig={companyConfig}
            setCompanyConfig={setCompanyConfig}
            isSavingConfig={isSavingConfig}
            onSave={saveCompanyConfig}
          />
        </TabsContent>

        <TabsContent value='facturacion' className='space-y-6'>
          <SettingsBillingTab
            configLoading={configLoading}
            billingConfig={billingConfig}
            setBillingConfig={setBillingConfig}
            isSavingConfig={isSavingConfig}
            onSave={saveCompanyConfig}
          />
        </TabsContent>

        <TabsContent value='permisos' className='space-y-6'>
          <SettingsPermissionsTab
            permissions={permissions}
            permissionsLoading={permissionsLoading}
            filteredPermissions={filteredPermissions}
            paginatedPermissions={paginatedPermissions}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            pageSize={pageSize}
            setPageSize={setPageSize}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            moduleFilter={moduleFilter}
            setModuleFilter={setModuleFilter}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            availableModules={availableModules}
            onClearFilters={handleClearFilters}
            onCreatePermission={handleCreatePermission}
            onEditPermission={handleEditPermission}
            onDeletePermission={handleDeletePermission}
          />
        </TabsContent>

        <TabsContent value='mantenimiento' className='space-y-6'>
          <SettingsMaintenanceTab
            backups={backups}
            backupsLoading={backupsLoading}
            isCreatingBackup={isCreatingBackup}
            restoringBackupId={restoringBackupId}
            isCleaning={isCleaning}
            onCreateBackup={createBackup}
            onDownloadBackup={downloadBackup}
            onRestoreBackup={restoreBackup}
            onOpenCleanModal={() => setIsCleanModalOpen(true)}
          />
        </TabsContent>

        <TabsContent value='logs' className='space-y-6'>
          <SettingsLogsTab />
        </TabsContent>
      </Tabs>

      <PermissionModal
        isOpen={isPermissionModalOpen}
        onOpenChange={setIsPermissionModalOpen}
        isEditMode={!!editingPermission}
        permissionData={editingPermission}
        onSubmit={handlePermissionSave}
        isLoading={isSavingPermission}
      />

      <CleanDatabaseConfirmModal
        open={isCleanModalOpen}
        onOpenChange={setIsCleanModalOpen}
        onConfirm={cleanDatabase}
        isLoading={isCleaning}
      />
    </div>
  );
}
