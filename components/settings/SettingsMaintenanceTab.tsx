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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, Database, Download, HardDrive, RotateCcw, Trash2 } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/collapsible-card';
import { toast } from 'sonner';
import { CleanDatabaseConfirmModal } from './CleanDatabaseConfirmModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import type { BackupItem } from './settings-types';
import logger from '@/lib/utils/logger';

export function SettingsMaintenanceTab() {
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupNombre, setBackupNombre] = useState('');
  const [restoringBackupId, setRestoringBackupId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingBackupId, setDeletingBackupId] = useState<string | null>(null);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);

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
          nombre: backupNombre.trim() || `backup_${new Date().toISOString().split('T')[0]}`,
          descripcion: 'Backup manual'
        })
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Backup creado correctamente');
        setBackupNombre('');
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

  const deleteBackup = async () => {
    if (!pendingDeleteId) return;
    const backupId = pendingDeleteId;
    setPendingDeleteId(null);

    try {
      setDeletingBackupId(backupId);
      const response = await fetch(`/api/settings/backup/${backupId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (result.success) {
        toast.success('Backup eliminado correctamente');
        await fetchBackups();
      } else {
        throw new Error(result.error || 'Error al eliminar backup');
      }
    } catch (error) {
      logger.captureException(error, { context: 'SettingsMaintenanceTab:deleteBackup' });
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el backup');
    } finally {
      setDeletingBackupId(null);
    }
  };

  const restoreBackup = async () => {
    if (!pendingRestoreId) return;
    const backupId = pendingRestoreId;
    setPendingRestoreId(null);

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
    try {
      setIsCleaning(true);
      const response = await fetch('/api/settings/database-clean', { method: 'POST' });
      const result = await response.json();
      if (result.success) {
        toast.success(
          `Base de datos limpiada. ${result.deletedCount} tabla(s) vaciada(s), ${result.skippedCount} tabla(s) protegida(s) conservada(s).`
        );
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
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <CollapsibleCard
          defaultOpen
          aria-label='Backups'
          className='flex flex-col h-full rounded-2xl border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900'
          headerClassName='p-4 sm:px-5 sm:py-4'
          contentClassName='flex-1 px-4 pb-4 sm:px-5 sm:pb-5'
          title={
            <div className='flex min-w-0 items-center gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/50'>
                <HardDrive className='h-5 w-5 text-blue-700 dark:text-blue-300' />
              </div>
              <div className='min-w-0'>
                <span className='block text-base font-semibold leading-tight text-neutral-900 sm:text-lg dark:text-white'>
                  Backups
                </span>
                <span className='mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400'>
                  Copias de seguridad de tus datos
                </span>
              </div>
            </div>
          }
        >
          <div className='space-y-4'>
            <form
              onSubmit={event => {
                event.preventDefault();
                void createBackup();
              }}
              className='space-y-3 border-b border-neutral-200 pb-4 dark:border-neutral-800'
            >
              <div>
                <p className='text-sm font-semibold text-neutral-900 dark:text-white'>
                  Crear un respaldo
                </p>
                <p className='mt-1 text-xs text-neutral-600 dark:text-neutral-400'>
                  Guarda el estado actual para poder restaurarlo más adelante.
                </p>
              </div>
              <div className='flex flex-col gap-3 sm:flex-row sm:items-end'>
                <div className='min-w-0 flex-1'>
                  <Label
                    htmlFor='backup-nombre'
                    className='mb-1.5 block text-xs font-medium text-neutral-700 dark:text-neutral-300'
                  >
                    Nombre del backup
                  </Label>
                  <Input
                    id='backup-nombre'
                    type='text'
                    placeholder='Ej. Cierre de mes'
                    value={backupNombre}
                    onChange={e => setBackupNombre(e.target.value)}
                    disabled={isCreatingBackup}
                    className='w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white'
                  />
                </div>
                <Button
                  type='submit'
                  variant='unstyled'
                  disabled={isCreatingBackup}
                  className='inline-flex w-full shrink-0 items-center justify-center rounded-full bg-blue-600 px-4 py-2.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto'
                >
                  {isCreatingBackup ? (
                    <>
                      <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white' />
                      Creando...
                    </>
                  ) : (
                    <>
                      <HardDrive className='mr-2 h-4 w-4' />
                      Crear backup
                    </>
                  )}
                </Button>
              </div>
            </form>

            {backupsLoading ? (
              <div className='py-6 text-center'>
                <div className='mx-auto h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600' />
                <p className='mt-2 text-sm text-neutral-500 dark:text-neutral-400'>
                  Cargando backups...
                </p>
              </div>
            ) : backups.length === 0 ? (
              <div className='py-6 text-center'>
                <HardDrive className='mx-auto mb-2 h-9 w-9 text-neutral-300 dark:text-neutral-600' />
                <p className='text-sm font-medium text-neutral-700 dark:text-neutral-300'>
                  Aún no hay backups
                </p>
                <p className='mt-1 text-xs text-neutral-500 dark:text-neutral-400'>
                  Crea uno para tener una copia lista ante cualquier eventualidad.
                </p>
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
                              onClick={() => setPendingRestoreId(backup.id_backup)}
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
                            <Button
                              variant='unstyled'
                              onClick={() => setPendingDeleteId(backup.id_backup)}
                              disabled={deletingBackupId === backup.id_backup}
                              className='p-1.5 text-red-600 hover:bg-red-50 rounded-full disabled:opacity-50'
                              title='Eliminar respaldo'
                            >
                              {deletingBackupId === backup.id_backup ? (
                                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-red-600'></div>
                              ) : (
                                <Trash2 className='h-4 w-4' />
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
          </div>
        </CollapsibleCard>

        <CollapsibleCard
          defaultOpen
          aria-label='Mantenimiento de Base de Datos'
          className='flex h-full flex-col rounded-2xl border-red-200 bg-white dark:border-red-900 dark:bg-neutral-900'
          headerClassName='p-4 sm:px-5 sm:py-4'
          contentClassName='flex-1 px-4 pb-4 sm:px-5 sm:pb-5'
          title={
            <div className='flex min-w-0 items-center gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 dark:bg-red-950'>
                <Database className='h-5 w-5 text-red-600 dark:text-red-400' />
              </div>
              <div className='min-w-0'>
                <span className='block text-base font-semibold leading-tight text-red-700 sm:text-lg dark:text-red-400'>
                  Vaciar base de datos
                </span>
                <span className='mt-1 block text-xs font-normal text-neutral-500 dark:text-neutral-400'>
                  Limpieza manual de datos operativos
                </span>
              </div>
            </div>
          }
        >
          <div className='space-y-4'>
            <div>
              <div className='flex items-start gap-3'>
                <AlertTriangle className='mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400' />
                <div>
                  <p className='text-sm font-semibold text-red-800 dark:text-red-300'>
                    Esta acción es irreversible
                  </p>
                  <p className='mt-1 text-xs leading-relaxed text-red-700 dark:text-red-300/90'>
                    Se eliminarán ventas, pedidos, inventario, compras, cajas, asistencias,
                    servicios, configuración y backups guardados. No se crea un respaldo automático.
                  </p>
                </div>
              </div>
            </div>

            <div className='border-t border-neutral-200 pt-4 dark:border-neutral-800'>
              <p className='text-sm font-medium text-neutral-800 dark:text-neutral-200'>
                Datos que se conservarán
              </p>
              <div className='mt-3 flex flex-wrap gap-2'>
                {DATABASE_CLEAN_PROTECTED_TABLES.map(table => (
                  <span
                    key={table}
                    className='rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                  >
                    {table}
                  </span>
                ))}
              </div>
              <p className='mt-3 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400'>
                Se mantienen permisos, migraciones y datos maestros. Los clientes se conservan, pero
                su saldo prepago queda en 0.
              </p>
            </div>

            <Button
              variant='unstyled'
              onClick={() => setIsCleanModalOpen(true)}
              disabled={isCleaning}
              className='inline-flex w-full items-center justify-center rounded-full bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50'
            >
              {isCleaning ? (
                <>
                  <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white' />
                  Limpiando...
                </>
              ) : (
                <>
                  <AlertTriangle className='mr-2 h-4 w-4' />
                  Vaciar base de datos
                </>
              )}
            </Button>
          </div>
        </CollapsibleCard>
      </div>

      <CleanDatabaseConfirmModal
        open={isCleanModalOpen}
        onOpenChange={setIsCleanModalOpen}
        onConfirm={cleanDatabase}
        isLoading={isCleaning}
      />

      <ConfirmModal
        open={pendingRestoreId !== null}
        onOpenChange={open => {
          if (!open) setPendingRestoreId(null);
        }}
        title='Restaurar backup'
        message='Se sobrescribirán todos los datos actuales con el contenido del backup. Esta acción no se puede deshacer.'
        confirmText='Restaurar'
        type='warning'
        isLoading={restoringBackupId !== null}
        onConfirm={restoreBackup}
      />

      <ConfirmModal
        open={pendingDeleteId !== null}
        onOpenChange={open => {
          if (!open) setPendingDeleteId(null);
        }}
        title='Eliminar backup'
        message='Este respaldo se borrará definitivamente y no se podrá recuperar. Esta acción no se puede deshacer.'
        confirmText='Eliminar'
        type='warning'
        isLoading={deletingBackupId !== null}
        onConfirm={deleteBackup}
      />
    </>
  );
}
