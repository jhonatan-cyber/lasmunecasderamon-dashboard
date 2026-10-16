'use client';
import { DATABASE_CLEAN_PROTECTED_TABLES } from '@/lib/constants/database-maintenance';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Database, Download, HardDrive, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CleanDatabaseConfirmModal } from './CleanDatabaseConfirmModal';
import type { BackupItem } from './settings-types';
import logger from '@/lib/utils/logger';

export function SettingsMaintenanceTab() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);

  const fetchBackups = useCallback(async () => {
    try {
      setBackupsLoading(true);
      const response = await fetch('/api/settings/backup');
      const result = await response.json();
      if (result.success) {
        setBackups(result.backups || []);
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsMaintenanceTab:fetchBackups' });
    } finally {
      setBackupsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const createBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const response = await fetch('/api/settings/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: `backup_${new Date().toISOString().split('T')[0]}`,
          descripcion: 'Backup manual'
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
      logger.captureException(error, { context: 'SettingsMaintenanceTab:createBackup' });
      toast.error('Error al crear el backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupId: string) => {
    if (
      !confirm(
        '¿Estás seguro de que quieres restaurar este backup? Se sobrescribirán todos los datos actuales.'
      )
    )
      return;
    if (!confirm('¿REALMENTE quieres continuar? Esta acción no se puede deshacer.')) return;

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
      logger.captureException(error, { context: 'SettingsMaintenanceTab:restoreBackup' });
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
      logger.captureException(error, { context: 'SettingsMaintenanceTab:downloadBackup' });
      toast.error('Error al descargar el backup');
    }
  };

  const cleanDatabase = async () => {
    const createAutomaticBackup = async () => {
      try {
        const response = await fetch('/api/settings/backup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombre: `backup_auto_${new Date().toISOString().split('T')[0]}`,
            descripcion: 'Backup automático antes de vaciar base de datos'
          })
        });
        const result = await response.json();
        if (result.success) {
          await fetchBackups();
          return result.backup;
        }
      } catch (error) {
        logger.captureException(error, { context: 'SettingsMaintenanceTab:autoBackup' });
      }
      return null;
    };

    try {
      setIsCleaning(true);
      const backup = await createAutomaticBackup();
      if (!backup?.id) throw new Error('No se pudo crear el respaldo previo al vaciado');
      const backupResponse = await fetch(`/api/settings/backup/${backup.id}/download`);
      if (!backupResponse.ok) throw new Error('No se pudo descargar el respaldo previo al vaciado');
      const backupBlob = await backupResponse.blob();
      const backupUrl = URL.createObjectURL(backupBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = backupUrl;
      downloadLink.download = `backup_${backup.id}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      setTimeout(() => URL.revokeObjectURL(backupUrl), 60000);
      const response = await fetch('/api/settings/database-clean', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast.success(`Base de datos limpiada. ${result.deletedCount} tablas vaciadas.`);
        setBackups([]);
      } else {
        throw new Error(result.error || 'Error desconocido');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsMaintenanceTab:cleanDatabase' });
      toast.error(error instanceof Error ? error.message : 'Error al limpiar la base de datos');
    } finally {
      setIsCleaning(false);
      setIsCleanModalOpen(false);
    }
  };

  return (
    <>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        <Card className='flex flex-col h-full'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg flex items-center gap-2'>
              <HardDrive className='h-5 w-5' />
              Backups
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 pb-4'>
            <p className='text-sm text-gray-600 dark:text-gray-300 mb-4'>
              Crea un backup antes de vaciar la base de datos para poder restaurar si es necesario.
            </p>

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
                <Table className='w-full'>
                  <TableHeader>
                    <TableRow className='border-b'>
                      <TableHead className='text-left font-medium'>Nombre</TableHead>
                      <TableHead className='text-left font-medium'>Fecha</TableHead>
                      <TableHead className='text-left font-medium'>Registros</TableHead>
                      <TableHead className='text-left font-medium'>Tamaño</TableHead>
                      <TableHead className='text-right font-medium'>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {backups.map(backup => (
                      <TableRow key={backup.id_backup} className='border-b'>
                        <TableCell className='font-medium'>{backup.nombre}</TableCell>
                        <TableCell>{new Date(backup.fecha_crea).toLocaleString('es-CL')}</TableCell>
                        <TableCell>{backup.registros_count}</TableCell>
                        <TableCell>{(backup.tamano_bytes / 1024).toFixed(1)} KB</TableCell>
                        <TableCell className='text-right'>
                          <div className='flex justify-end gap-2'>
                            <Button
                              variant='unstyled'
                              onClick={() => downloadBackup(backup.id_backup)}
                              className='p-1.5 text-blue-600 hover:bg-blue-50 rounded-full'
                              title='Descargar JSON'
                            >
                              <Download className='h-4 w-4' />
                            </Button>
                            <Button
                              variant='unstyled'
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
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className='flex justify-end border-t pt-4 mt-auto'>
            <Button
              variant='unstyled'
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
            </Button>
          </CardFooter>
        </Card>

        <Card className='border-red-200 dark:border-red-900 flex flex-col h-full'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-lg flex items-center gap-2 text-red-600 dark:text-red-400'>
              <Database className='h-5 w-5' />
              Mantenimiento de Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className='flex-1 pb-4'>
            <div className='text-sm text-gray-600 dark:text-gray-300'>
              <p>Esta acción vaciará todas las tablas excepto:</p>
              <ul className='list-disc list-inside mt-1 text-gray-500'>
                {DATABASE_CLEAN_PROTECTED_TABLES.map(table => (
                  <li key={table}>{table}</li>
                ))}
              </ul>
              <p className='mt-2 text-xs'>
                Se conservan las asignaciones de permisos y el historial técnico de migraciones.
                También se eliminarán productos, inventario, compras, habitaciones, configuración y
                respaldos guardados. Se descargará un respaldo antes del vaciado.
              </p>
            </div>
          </CardContent>
          <CardFooter className='flex justify-end border-t pt-4 mt-auto'>
            <Button
              variant='unstyled'
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
            </Button>
          </CardFooter>
        </Card>
      </div>

      <CleanDatabaseConfirmModal
        open={isCleanModalOpen}
        onOpenChange={setIsCleanModalOpen}
        onConfirm={cleanDatabase}
        isLoading={isCleaning}
      />
    </>
  );
}
