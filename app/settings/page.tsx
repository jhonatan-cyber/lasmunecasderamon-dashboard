'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Key, Plus, Search, Edit, Trash2, Database, AlertTriangle, Building2, Settings as SettingsIcon, Save, Download, RotateCcw, HardDrive, Trash } from 'lucide-react';
import { toast } from 'sonner';
import { ClientsSkeleton } from '@/components/shared/Skeletons';
import { PermissionTable, Permission } from '@/components/permissions/PermissionTable';
import { PermissionFilters } from '@/components/permissions/PermissionFilters';
import { PermissionStatsCards } from '@/components/permissions/PermissionStatsCards';
import dynamic from 'next/dynamic';

const PermissionModal = dynamic(
  () => import('@/components/permissions/PermissionModal').then(mod => mod.PermissionModal),
  { ssr: false }
);

const CleanDatabaseConfirmModal = dynamic(
  () => import('@/components/settings/CleanDatabaseConfirmModal').then(mod => mod.CleanDatabaseConfirmModal),
  { ssr: false }
);
import Paginate from '@/components/shared/Paginate';

interface CompanyConfig {
  empresa_nombre: string;
  empresa_rut: string;
  empresa_direccion: string;
  empresa_telefono: string;
  empresa_email: string;
  empresa_facebook: string;
  empresa_instagram: string;
  empresa_whatsapp: string;
  empresa_tiktok?: string;
}

interface BillingConfig {
  impuesto_iva: string;
  impuesto_propina: string;
  moneda: string;
  facturacion_activada: boolean;
  resolucion_sii: string;
}

interface SystemConfig {
  ambiente: string;
  timezone: string;
}

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
  
  // Backup state
  const [backups, setBackups] = useState<any[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  
  // Company config state
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
  
  // Billing config state
  const [billingConfig, setBillingConfig] = useState<BillingConfig>({
    impuesto_iva: '19',
    impuesto_propina: '10',
    moneda: 'CLP',
    facturacion_activada: true,
    resolucion_sii: ''
  });
  
  // System config state
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    ambiente: 'produccion',
    timezone: 'America/Santiago'
  });
  
  const [configLoading, setConfigLoading] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Available modules for filter
  const availableModules = useMemo(() => {
    const modules = new Set(permissions.map(p => p.module));
    return Array.from(modules).sort();
  }, [permissions]);

  // Filter, sort and paginate permissions
  const filteredPermissions = useMemo(() => {
    let result = Array.isArray(permissions) ? [...permissions] : [];

    // Filter by search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(permission =>
        permission.name.toLowerCase().includes(search) ||
        permission.module.toLowerCase().includes(search) ||
        permission.action.toLowerCase().includes(search)
      );
    }

    // Filter by module
    if (moduleFilter !== 'all') {
      result = result.filter(permission => permission.module === moduleFilter);
    }

    // Sort
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

  // Paginated permissions
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

  // Reset page when filters change
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
        // Company config
        if (result.data.empresa) {
          setCompanyConfig(prev => ({
            ...prev,
            ...result.data.empresa
          }));
        }
        // Billing config
        if (result.data.facturacion) {
          setBillingConfig(prev => ({
            ...prev,
            ...result.data.facturacion
          }));
        }
        // System config
        if (result.data.sistema) {
          setSystemConfig(prev => ({
            ...prev,
            ...result.data.sistema
          }));
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
    if (!confirm('¿Estás seguro de que quieres restaurar este backup?\n\nSe sobrescribirán todos los datos actuales.')) {
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
      
      // Save company config
      for (const [key, value] of Object.entries(companyConfig)) {
        await fetch('/api/configurations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clave: key, valor: value })
        });
      }
      
      // Save billing config
      for (const [key, value] of Object.entries(billingConfig)) {
        await fetch('/api/configurations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clave: key, valor: String(value) })
        });
      }
      
      // Save system config
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
    // First create automatic backup
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

    if (!confirm('¿Estás seguro de que quieres VACIAR la base de datos?\n\nSe eliminará TODO excepto:\n- Usuarios\n- Roles\n- Permisos\n- Configuraciones\n\nEsta acción no se puede deshacer.')) {
      return;
    }

    if (!confirm('¿REALMENTE quieres continuar?\n\nSe perderán TODOS los datos de ventas, pedidos, productos, clientes, etc.\n\nSe creará un backup automático antes de vaciar.')) {
      return;
    }

    try {
      setIsCleaning(true);
      
      // Create automatic backup first
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

  if (permissionsLoading) return <ClientsSkeleton />;

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

  const handlePermissionSave = async (permissionData: { name: string; module: string; action: string; description: string }) => {
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
          setPermissions(prev => [...prev, newPermission]);
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

  return (
    <div className='container mx-auto p-4 sm:p-6 lg:p-8 max-w-7xl'>
      <Tabs defaultValue='empresa' className='space-y-6'>
        <TabsList className='flex flex-wrap gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-full'>
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
        </TabsList>

        {/* TAB: INFORMACIÓN DE LA EMPRESA */}
        <TabsContent value='empresa' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Building2 className='h-5 w-5' />
                Información de la Empresa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className='text-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto'></div>
                  <p className='text-sm text-gray-600 mt-2'>Cargando configuración...</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Nombre de la Empresa</label>
                      <input
                        type='text'
                        value={companyConfig.empresa_nombre}
                        onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_nombre: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='Las Muñecas de Ramón'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>RUT</label>
                      <input
                        type='text'
                        value={companyConfig.empresa_rut}
                        onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_rut: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='12.345.678-9'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Dirección</label>
                      <input
                        type='text'
                        value={companyConfig.empresa_direccion}
                        onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_direccion: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='Dirección de la empresa'
                      />
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Teléfono</label>
                      <input
                        type='text'
                        value={companyConfig.empresa_telefono}
                        onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_telefono: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='+56 9 1234 5678'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Email</label>
                      <input
                        type='email'
                        value={companyConfig.empresa_email}
                        onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_email: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='contacto@empresa.cl'
                      />
                    </div>
                    <div className='grid grid-cols-2 gap-4'>
                      <div>
                        <label className='block text-sm font-medium mb-1'>WhatsApp</label>
                        <input
                          type='text'
                          value={companyConfig.empresa_whatsapp}
                          onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_whatsapp: e.target.value }))}
                          className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                          placeholder='+56 9 1234 5678'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium mb-1'>Instagram</label>
                        <input
                          type='text'
                          value={companyConfig.empresa_instagram}
                          onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_instagram: e.target.value }))}
                          className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                          placeholder='@instagram'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium mb-1'>Facebook</label>
                        <input
                          type='text'
                          value={companyConfig.empresa_facebook}
                          onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_facebook: e.target.value }))}
                          className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                          placeholder='@facebook'
                        />
                      </div>
                      <div>
                        <label className='block text-sm font-medium mb-1'>TikTok</label>
                        <input
                          type='text'
                          value={companyConfig.empresa_tiktok || ''}
                          onChange={e => setCompanyConfig(prev => ({ ...prev, empresa_tiktok: e.target.value }))}
                          className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                          placeholder='@tiktok'
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className='mt-6 flex justify-end'>
                <button
                  onClick={saveCompanyConfig}
                  disabled={isSavingConfig}
                  className='flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50'
                >
                  <Save className='h-4 w-4' />
                  {isSavingConfig ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: FACTURACIÓN */}
        <TabsContent value='facturacion' className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <SettingsIcon className='h-5 w-5' />
                Configuración de Facturación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {configLoading ? (
                <div className='text-center py-8'>
                  <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto'></div>
                  <p className='text-sm text-gray-600 mt-2'>Cargando configuración...</p>
                </div>
              ) : (
                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1'>% IVA</label>
                      <input
                        type='number'
                        value={billingConfig.impuesto_iva}
                        onChange={e => setBillingConfig(prev => ({ ...prev, impuesto_iva: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='19'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>% Propina por defecto</label>
                      <input
                        type='number'
                        value={billingConfig.impuesto_propina}
                        onChange={e => setBillingConfig(prev => ({ ...prev, impuesto_propina: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='10'
                      />
                    </div>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Moneda</label>
                      <select
                        value={billingConfig.moneda}
                        onChange={e => setBillingConfig(prev => ({ ...prev, moneda: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                      >
                        <option value='CLP'>CLP - Peso Chileno</option>
                        <option value='USD'>USD - Dólar</option>
                        <option value='EUR'>EUR - Euro</option>
                      </select>
                    </div>
                  </div>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-sm font-medium mb-1'>Resolución SII</label>
                      <input
                        type='text'
                        value={billingConfig.resolucion_sii}
                        onChange={e => setBillingConfig(prev => ({ ...prev, resolucion_sii: e.target.value }))}
                        className='w-full px-3 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-black focus:border-transparent'
                        placeholder='Resolución SII'
                      />
                    </div>
                    <div className='flex items-center gap-3 p-4 border border-gray-200 rounded-full'>
                      <input
                        type='checkbox'
                        id='facturacion_activada'
                        checked={billingConfig.facturacion_activada}
                        onChange={e => setBillingConfig(prev => ({ ...prev, facturacion_activada: e.target.checked }))}
                        className='w-5 h-5 rounded border-gray-300 text-black focus:ring-black'
                      />
                      <label htmlFor='facturacion_activada' className='text-sm font-medium'>
                        Activar facturación electrónica
                      </label>
                    </div>
                  </div>
                </div>
              )}
              
              <div className='mt-6 flex justify-end'>
                <button
                  onClick={saveCompanyConfig}
                  disabled={isSavingConfig}
                  className='flex items-center gap-2 px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 disabled:opacity-50'
                >
                  <Save className='h-4 w-4' />
                  {isSavingConfig ? 'Guardando...' : 'Guardar Configuración'}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: PERMISOS */}
        <TabsContent value='permisos' className='space-y-6'>
          <div className='space-y-4 sm:space-y-6'>
            {/* Header */}
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

            {/* Stats Cards */}
            <PermissionStatsCards permissions={permissions} />

            {/* Filters */}
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

            {/* Permissions List */}
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
          </div>
        </TabsContent>

        {/* TAB: MANTENIMIENTO */}
        <TabsContent value='mantenimiento' className='space-y-6'>
          {/* Backups Section */}
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg flex items-center gap-2'>
                <HardDrive className='h-5 w-5' />
                Backups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4'>
                <p className='text-sm text-gray-600 dark:text-gray-300'>
                  Crea un backup antes de vaciar la base de datos para poder restaurar si es necesario.
                </p>
                <button
                  onClick={createBackup}
                  disabled={isCreatingBackup}
                  className='inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm'
                >
                  {isCreatingBackup ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                      Creando...
                    </>
                  ) : (
                    <>
                      <HardDrive className='h-4 w-4 mr-2' />
                      Crear Backup
                    </>
                  )}
                </button>
              </div>

              {/* Backups List */}
              {backupsLoading ? (
                <div className='text-center py-4'>
                  <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-black mx-auto'></div>
                  <p className='text-sm text-gray-500 mt-2'>Cargando backups...</p>
                </div>
              ) : backups.length === 0 ? (
                <div className='text-center py-6 text-gray-500'>
                  <HardDrive className='h-10 w-10 mx-auto mb-2 opacity-30' />
                  <p>No hay backups disponibles</p>
                </div>
              ) : (
                <div className='overflow-x-auto'>
                  <table className='w-full text-sm'>
                    <thead>
                      <tr className='border-b'>
                        <th className='text-left py-2 px-3 font-medium text-gray-500'>Nombre</th>
                        <th className='text-left py-2 px-3 font-medium text-gray-500'>Fecha</th>
                        <th className='text-left py-2 px-3 font-medium text-gray-500'>Registros</th>
                        <th className='text-left py-2 px-3 font-medium text-gray-500'>Tamaño</th>
                        <th className='text-right py-2 px-3 font-medium text-gray-500'>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {backups.map((backup) => (
                        <tr key={backup.id_backup} className='border-b hover:bg-gray-50'>
                          <td className='py-2 px-3 font-medium'>{backup.nombre}</td>
                          <td className='py-2 px-3 text-gray-600'>
                            {new Date(backup.fecha_crea).toLocaleString('es-CL')}
                          </td>
                          <td className='py-2 px-3 text-gray-600'>{backup.registros_count}</td>
                          <td className='py-2 px-3 text-gray-600'>
                            {(backup.tamano_bytes / 1024).toFixed(1)} KB
                          </td>
                          <td className='py-2 px-3 text-right'>
                            <div className='flex justify-end gap-2'>
                              <button
                                onClick={() => downloadBackup(backup.id_backup)}
                                className='p-1.5 text-blue-600 hover:bg-blue-50 rounded-full'
                                title='Descargar JSON'
                              >
                                <Download className='h-4 w-4' />
                              </button>
                              <button
                                onClick={() => restoreBackup(backup.id_backup)}
                                disabled={restoringBackupId === backup.id_backup}
                                className='p-1.5 text-green-600 hover:bg-green-50 rounded-full disabled:opacity-50'
                                title='Restaurar'
                              >
                                {restoringBackupId === backup.id_backup ? (
                                  <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-green-600'></div>
                                ) : (
                                  <RotateCcw className='h-4 w-4' />
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Clean Database Section */}
          <Card className='border-red-200 dark:border-red-900'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-lg flex items-center gap-2 text-red-600 dark:text-red-400'>
                <Database className='h-5 w-5' />
                Mantenimiento de Base de Datos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
                <div className='text-sm text-gray-600 dark:text-gray-300'>
                  <p>Esta acción vaciará todas las tablas excepto:</p>
                  <ul className='list-disc list-inside mt-1 text-gray-500'>
                    <li>usuarios</li>
                    <li>roles</li>
                    <li>permissions</li>
                    <li>configuraciones</li>
                  </ul>
                </div>
                <button
                  onClick={() => setIsCleanModalOpen(true)}
                  disabled={isCleaning}
                  className='inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-full hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm'
                >
                  {isCleaning ? (
                    <>
                      <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2' />
                      Limpiando...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className='h-4 w-4 mr-2' />
                      Vaciar Base de Datos
                    </>
                  )}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Permission Modal */}
      <PermissionModal
        isOpen={isPermissionModalOpen}
        onOpenChange={setIsPermissionModalOpen}
        isEditMode={!!editingPermission}
        permissionData={editingPermission}
        onSubmit={handlePermissionSave}
        isLoading={isSavingPermission}
      />

      {/* Clean Database Confirmation Modal */}
      <CleanDatabaseConfirmModal
        open={isCleanModalOpen}
        onOpenChange={setIsCleanModalOpen}
        onConfirm={cleanDatabase}
        isLoading={isCleaning}
      />
    </div>
  );
}