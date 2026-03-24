/* eslint-disable */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle } from 'lucide-react';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import useAnticipos from '@/hooks/personal/useAnticipos';
import AdvanceFormDialog from '@/components/advances/AdvanceFormDialog';
import AdvancesTable, { Advance } from '@/components/advances/AdvancesTable';
import AdvancesFilters from '@/components/advances/AdvancesFilters';
import Paginate from '@/components/ui/paginate';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { ReportSkeleton } from '@/components/ui/skeletons';

export default function AdvancesPage() {
  const router = useRouter();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const { data: anticipos, loading, fetchAnticipos } = useAnticipos();
  const { hasPermission } = useUserPermissions();
  const [openDialog, setOpenDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [page, setPage] = useState(1);

  if (loading || cajaLoading) {
    return <ReportSkeleton />;
  }

  // Verificar permisos
  const canCreate = hasPermission('anticipos', 'crear');

  // Convertir datos del hook al formato esperado por la tabla
  const advances: Advance[] = anticipos.map(a => ({
    id: a.id_anticipo,
    usuario: a.usuario || 'Usuario sin nombre',
    monto: Number(a.monto || 0),
    fecha_crea: a.fecha_crea || '',
    estado: String(a.estado || 0)
  }));

  // Filtro frontend por usuario
  const filteredAdvances = advances.filter(a =>
    (a.usuario || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const paginatedAdvances = filteredAdvances.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const handleOpenDialog = () => {
    if (!hasOpenCaja) {
      toast.error(
        'No se puede crear anticipos sin caja abierta. Por favor, abra una caja primero.'
      );
      return;
    }
    setOpenDialog(true);
  };

  const totalPages = Math.ceil(filteredAdvances.length / rowsPerPage) || 1;

  return (
    <PermissionGuard module="advances" action="view">
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 pt-4 sm:pt-8 px-4 sm:px-8'>
          <div className='flex items-center gap-4'>
            <div>
              <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Anticipos</h1>
              <p className='text-sm sm:text-base text-gray-600 mt-2'>
                Gestiona los anticipos de sueldo del personal
              </p>
            </div>
          </div>
          {canCreate && (
            <AdvanceFormDialog open={openDialog} setOpen={setOpenDialog} onCreated={fetchAnticipos}>
              <Button
                onClick={handleOpenDialog}
                disabled={cajaLoading || !hasOpenCaja}
                className={`w-full sm:w-auto rounded-full px-4 sm:px-6 py-2 shadow transition-all duration-200 text-sm sm:text-base ${
                  hasOpenCaja
                    ? 'bg-black text-white hover:scale-105'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {cajaLoading ? (
                  <>
                    <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2' />
                    Verificando...
                  </>
                ) : hasOpenCaja ? (
                  <>
                    <Plus className='mr-2' />
                    Nuevo Anticipo
                  </>
                ) : (
                  <>
                    <AlertCircle className='mr-2' />
                    Sin Caja
                  </>
                )}
              </Button>
            </AdvanceFormDialog>
          )}
        </div>

      {/* Mensaje de advertencia cuando no hay caja abierta */}
      {!cajaLoading && hasOpenCaja === false && (
        <div className='px-4 sm:px-8'>
          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
            <div className='flex items-center'>
              <AlertCircle className='h-5 w-5 text-yellow-600 mr-2' />
              <div>
                <h3 className='text-sm font-medium text-yellow-800'>Caja cerrada</h3>
                <p className='text-sm text-yellow-700 mt-1'>
                  No se pueden crear nuevos anticipos sin una caja abierta. Por favor, abra una caja
                  en el módulo de caja primero.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className='px-4 sm:px-8 mt-4 sm:mt-6'>
        <AdvancesFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          rowsPerPage={rowsPerPage}
          setRowsPerPage={setRowsPerPage}
          setPage={setPage}
        />
        <div className='overflow-x-auto'>
          <AdvancesTable advances={paginatedAdvances} loading={loading} />
        </div>
        {totalPages > 1 && (
          <div className='flex justify-center mt-4 sm:mt-6'>
            <Paginate page={page} totalPages={totalPages} setPage={setPage} />
          </div>
        )}
      </div>
      </div>
    </PermissionGuard>
  );
}
