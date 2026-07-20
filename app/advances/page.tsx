'use client';

import { useState } from 'react';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { useAnticipos } from '@/hooks/personal';
import AdvancesTable from '@/components/advances/AdvancesTable';
import AdvancesFilters from '@/components/advances/AdvancesFilters';
import AdvancesStatsCards from '@/components/advances/AdvancesStatsCards';
import Paginate from '@/components/shared/Paginate';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { AdvancesHeader } from '@/components/advances/AdvancesHeader';
import { AdvancesDialog } from '@/components/advances/AdvancesDialog';
import { CajaStatusBanner } from '@/components/sales/CajaStatusBanner';

type TabType = 'pending' | 'paid';

export default function AdvancesPage() {
  const { hasOpenCaja, efectivoEnCaja, loading: cajaLoading } = useCashRegisterStatus();
  const {
    anticipos,
    allAnticipos,
    loading,
    fetchAnticipos,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    onClearFilters,
    isAdmin,
    processAnticipo
  } = useAnticipos();

  const { hasPermission } = useUserPermissions();
  const [openDialog, setOpenDialog] = useState(false);
  const [advanceError, setAdvanceError] = useState<string | null>(null);
  const [advanceSaving, setAdvanceSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('pending');

  const canCreate = hasPermission('anticipos', 'crear');

  const pendingCount = (allAnticipos || []).filter(
    a => Number(a.estado) === 1 && !a.fecha_cobro
  ).length;
  const paidCount = (allAnticipos || []).filter(
    a => Number(a.estado) === 4 || !!a.fecha_cobro
  ).length;

  const handleOpenDialog = () => {
    setAdvanceError(null);
    setOpenDialog(true);
  };

  const handleAdvanceSubmit = async (data: {
    usuario_id: string;
    monto: string;
    motivo: string;
  }) => {
    setAdvanceError(null);
    if (!data.usuario_id) {
      setAdvanceError('Selecciona un usuario');
      return;
    }
    if (!data.monto || isNaN(Number(data.monto)) || Number(data.monto) <= 0) {
      setAdvanceError('Ingresa un monto válido');
      return;
    }

    setAdvanceSaving(true);
    try {
      const res = await fetch('/api/anticipos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario_id: data.usuario_id,
          monto: data.monto,
          motivo: data.motivo,
          device_date: new Date().toISOString()
        })
      });
      const result = await res.json();
      if (res.ok && result.success) {
        toast.success(result.message || 'Anticipo otorgado correctamente');
        setOpenDialog(false);
        fetchAnticipos();
        window.dispatchEvent(new Event('anticipoOtorgado'));
      } else {
        setAdvanceError(result.message || 'No se pudo enviar la solicitud');
      }
    } catch {
      setAdvanceError('Error de red o del servidor');
    } finally {
      setAdvanceSaving(false);
    }
  };

  return (
    <PermissionGuard module='advances' action='view'>
      <BoneyardSkeleton name='advances-main' loading={loading || cajaLoading}>
        <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
          <CajaStatusBanner entityName='anticipos' />

          <AdvancesHeader
            canCreate={canCreate}
            hasOpenCaja={hasOpenCaja}
            cajaLoading={cajaLoading}
            onOpenDialog={handleOpenDialog}
          />

          <div className='px-4 sm:px-8'>
            <AdvancesStatsCards advances={allAnticipos || []} />
          </div>

          <div className='px-4 sm:px-8 mt-4 sm:mt-6'>
            <AdvancesFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              sortBy={sortBy}
              setSortBy={setSortBy}
              sortOrder={sortOrder}
              setSortOrder={setSortOrder}
              pageSize={pageSize}
              setPageSize={setPageSize}
              onClearFilters={onClearFilters}
              loading={loading}
              isAdmin={isAdmin}
            />

            {}
            <div className='flex justify-center gap-3 border-b pb-1 mb-4'>
              <button
                onClick={() => {
                  setActiveTab('pending');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-5 py-2 text-sm font-semibold transition-all ${
                  activeTab === 'pending'
                    ? 'bg-amber-100 text-amber-700 rounded-full shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 rounded-full'
                }`}
              >
                Por Cobrar
                <span
                  className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'pending'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {pendingCount}
                </span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('paid');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 px-5 py-2 text-sm font-semibold transition-all ${
                  activeTab === 'paid'
                    ? 'bg-green-100 text-green-700 rounded-full shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 rounded-full'
                }`}
              >
                Cobrados
                <span
                  className={`ml-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                    activeTab === 'paid' ? 'bg-green-600 text-white' : 'bg-green-100 text-green-800'
                  }`}
                >
                  {paidCount}
                </span>
              </button>
            </div>

            <div className='overflow-x-auto'>
              <AdvancesTable
                advances={anticipos}
                loading={loading}
                isAdmin={isAdmin}
                onAction={processAnticipo}
                activeTab={activeTab}
              />
            </div>

            {totalPages > 1 && (
              <div className='flex justify-center mt-4 sm:mt-6'>
                <Paginate page={page} totalPages={totalPages} setPage={setPage} />
              </div>
            )}
          </div>
        </div>

        <AdvancesDialog
          open={openDialog}
          onOpenChange={setOpenDialog}
          onSubmit={handleAdvanceSubmit}
          isLoading={advanceSaving}
          error={advanceError}
          efectivoEnCaja={efectivoEnCaja}
        />
      </BoneyardSkeleton>
    </PermissionGuard>
  );
}
