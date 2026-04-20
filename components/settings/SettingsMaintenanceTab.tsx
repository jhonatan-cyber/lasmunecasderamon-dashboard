'use client';

import { AlertTriangle, Database, Download, HardDrive, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BackupItem } from './settings-types';

interface SettingsMaintenanceTabProps {
  backups: BackupItem[];
  backupsLoading: boolean;
  isCreatingBackup: boolean;
  restoringBackupId: string | null;
  isCleaning: boolean;
  onCreateBackup: () => void;
  onDownloadBackup: (backupId: string) => void;
  onRestoreBackup: (backupId: string) => void;
  onOpenCleanModal: () => void;
}

export function SettingsMaintenanceTab({
  backups,
  backupsLoading,
  isCreatingBackup,
  restoringBackupId,
  isCleaning,
  onCreateBackup,
  onDownloadBackup,
  onRestoreBackup,
  onOpenCleanModal
}: SettingsMaintenanceTabProps) {
  return (
    <>
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
              onClick={onCreateBackup}
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
                  {backups.map(backup => (
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
                            onClick={() => onDownloadBackup(backup.id_backup)}
                            className='p-1.5 text-blue-600 hover:bg-blue-50 rounded-full'
                            title='Descargar JSON'
                          >
                            <Download className='h-4 w-4' />
                          </button>
                          <button
                            onClick={() => onRestoreBackup(backup.id_backup)}
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
              onClick={onOpenCleanModal}
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
    </>
  );
}
