'use client';

import { useEffect, useState, useCallback } from 'react';
import { useOvertime } from '@/hooks/personal';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useOvertimeTable } from '@/hooks/personal';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { toast } from 'sonner';
import { Plus, AlertCircle } from 'lucide-react';

import OvertimeFilters from '@/components/overtime/OvertimeFilters';
import OvertimeStatsCards from '@/components/overtime/OvertimeStatsCards';
import OvertimeTable from '@/components/overtime/OvertimeTable';
import OvertimeFormModal from '@/components/overtime/OvertimeFormModal';
import OvertimeDetailModal from '@/components/overtime/OvertimeDetailModal';
import Paginate from '@/components/shared/Paginate';

// --- SUB-COMPONENTS ---

/**
 * Alerta de caja cerrada para informar al usuario
 */
const CajaAviso = ({ loading, hasOpenCaja }: { loading: boolean; hasOpenCaja: boolean }) => {
  if (loading || hasOpenCaja) return null;
  return (
    <Card className='border-none shadow-md bg-amber-50 dark:bg-amber-900/20 rounded-3xl overflow-hidden'>
      <CardContent className='p-4 flex items-center gap-4 text-amber-800 dark:text-amber-200'>
        <AlertCircle className='h-6 w-6 text-amber-600' />
        <p className='text-sm font-bold'>
          Debes tener una caja abierta para registrar nuevas horas extras.
        </p>
      </CardContent>
    </Card>
  );
};

export default function OvertimePage() {
  const { overtime: data, loading, error, getOvertime, createOvertime } = useOvertime();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();
  const table = useOvertimeTable({ overtime: data });
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (error) toast.error(`Error: ${error}`);
  }, [error]);

  const handleOpenFormDialog = useCallback(() => {
    if (!hasOpenCaja) {
      toast.error('No se puede crear horas extras sin caja abierta.');
      return;
    }
    setShowFormDialog(true);
  }, [hasOpenCaja]);

  const handleOvertimeSubmit = async (formData: {
    usuario_id: string;
    hora: number;
    monto: number;
  }) => {
    try {
      await createOvertime(formData);
      toast.success('Hora extra registrada exitosamente');
      setShowFormDialog(false);
      getOvertime();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al registrar');
    }
  };

  const handleViewDetail = useCallback((item: any) => {
    setSelectedUser({ id: item.id_usuario, name: item.usuario });
    setShowDetailModal(true);
  }, []);

  return (
    <PermissionGuard module='overtime' action='view'>
      <div className='w-full max-w-none px-1 sm:px-6 lg:px-10 py-4 sm:py-6 space-y-6'>
        {/* HEADER SECTION */}
        <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
          <div className='flex flex-col'>
            <h1 className='text-3xl font-bold tracking-tight'>Horas Extras</h1>
            <p className='text-gray-600 dark:text-neutral-300 mt-1'>
              Supervisión de registros, pagos y balances históricos del personal.
            </p>
          </div>
          <Button
            onClick={handleOpenFormDialog}
            disabled={cajaLoading || !hasOpenCaja}
            variant='outline'
            type='button'
            className='w-full sm:w-auto justify-center flex items-center gap-2 rounded-full bg-black text-white dark:bg-black dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-black dark:hover:border-white hover:scale-105 transition-all duration-200 text-sm sm:text-base px-6 py-2 border-2'
          >
            <Plus className='w-4 h-4 ' />
            Nueva Hora Extra
          </Button>
        </div>

        {/* ALERTS SECTION */}
        <CajaAviso loading={!!cajaLoading} hasOpenCaja={hasOpenCaja === true} />

        {/* DATA SECTION */}
        <div>
          <OvertimeStatsCards overtime={data} />
        </div>

        <div className='mt-4 sm:mt-6'>
          <OvertimeFilters
            searchTerm={table.searchTerm}
            setSearchTerm={table.setSearchTerm}
            statusFilter={table.statusFilter}
            setStatusFilter={table.setStatusFilter}
            sortBy={table.sortBy}
            setSortBy={setSortBy => table.setSortBy(String(setSortBy))}
            sortOrder={table.sortOrder}
            setSortOrder={table.setSortOrder}
            pageSize={table.pageSize}
            setPageSize={table.setPageSize}
            onClearFilters={table.handleClearFilters}
            loading={loading}
            isAdmin={true}
          />

          <OvertimeTable
            loading={loading}
            rows={table.paginatedData}
            pageSize={table.pageSize}
            onViewDetail={handleViewDetail}
            isAdmin={true}
          />

          {table.totalPages > 1 && (
            <div className='flex justify-center mt-4'>
              <Paginate page={table.page} totalPages={table.totalPages} setPage={table.setPage} />
            </div>
          )}
        </div>

        <OvertimeFormModal
          isOpen={showFormDialog}
          onOpenChange={setShowFormDialog}
          onSubmit={handleOvertimeSubmit}
          isLoading={loading}
        />

        {showDetailModal && selectedUser && (
          <OvertimeDetailModal
            isOpen={showDetailModal}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedUser(null);
            }}
            userId={selectedUser.id}
            userName={selectedUser.name}
          />
        )}
      </div>
    </PermissionGuard>
  );
}

