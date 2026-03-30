'use client';

import { useState } from 'react';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import useAnticipos from '@/hooks/personal/useAnticipos';
import AdvancesTable from '@/components/advances/AdvancesTable';
import AdvancesFilters from '@/components/advances/AdvancesFilters';
import AdvancesStatsCards from '@/components/advances/AdvancesStatsCards';
import Paginate from '@/components/shared/Paginate';
import { toast } from 'sonner';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { ReportSkeleton } from '@/components/shared/Skeletons';
import { AdvancesHeader } from '@/components/advances/AdvancesHeader';
import { AdvancesCajaAlert } from '@/components/advances/AdvancesCajaAlert';
import { AdvancesDialog } from '@/components/advances/AdvancesDialog';

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

  if (loading || cajaLoading) {
    return <ReportSkeleton />;
  }

  const canCreate = hasPermission('anticipos', 'crear');

  const handleOpenDialog = () => {
    if (!hasOpenCaja) {
      toast.error('No se puede crear anticipos sin caja abierta. Por favor, abre una caja primero.');
      return;
    }
    setAdvanceError(null);
    setOpenDialog(true);
  };

  const handleAdvanceSubmit = async (data: { usuario_id: string; monto: string; motivo: string }) => {
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
        // Emitir evento para actualizar balance de caja en otros componentes
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
      <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
        <AdvancesHeader 
          canCreate={canCreate} 
          hasOpenCaja={hasOpenCaja} 
          cajaLoading={cajaLoading} 
          onOpenDialog={handleOpenDialog} 
        />

        <AdvancesCajaAlert 
          cajaLoading={cajaLoading} 
          hasOpenCaja={hasOpenCaja} 
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
          
          <div className='overflow-x-auto'>
            <AdvancesTable 
              advances={anticipos} 
              loading={loading} 
              isAdmin={isAdmin} 
              onAction={processAnticipo}
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
    </PermissionGuard>
  );
}
