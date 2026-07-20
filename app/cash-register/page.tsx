'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Skeleton as BoneyardSkeleton } from 'boneyard-js/react';
import { Button } from '@/components/ui/button';
import { useCashRegister } from '@/hooks/caja/useCashRegister';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import dynamic from 'next/dynamic';
import logger from '@/lib/utils/logger';
import { appEventBus } from '@/lib/utils/eventBus';
import {
  CajaCard,
  CajaFormDialog,
  CerrarCajaDialog,
  RetiroDineroDialog,
  CajaFilters
} from '@/components/caja';
const DynamicCajaDetails = dynamic(() => import('@/components/caja').then(mod => mod.CajaDetails), {
  ssr: false
});
import { CashRegisterStatsCard, CashRegisterDetailedStats } from '@/components/cash-register';
import { CajaWithUser, CajaCreate, CajaCierre, CajaRetiro } from '@/types/caja';
import { AlertTriangle, RotateCcw, Wallet, Plus, Info } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function CashRegister() {
  const {
    cajas,
    loading,
    error,
    getCajas,
    getResumen,
    createCaja,
    cerrarCaja,
    retirarDinero,
    mutationError
  } = useCashRegister();
  const { user } = useCurrentUser();
  const { hasPermission } = useUserPermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCaja, setSelectedCaja] = useState<CajaWithUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);
  const [showRetiroDialog, setShowRetiroDialog] = useState(false);
  const [cashierTab, setCashierTab] = useState('cajas');

  const isCajero = user?.role === 'cajero';

  const canOpenCaja = hasPermission('cash_register', 'open');
  const canCloseCaja = hasPermission('cash_register', 'close');
  const canViewDetails = hasPermission('cash_register', 'view_details');
  const canWithdrawMoney = hasPermission('cash_register', 'withdraw');

  const filteredCajas = cajas.filter(caja => {
    const matchesSearch =
      caja.cajero_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caja.id_caja.toString().includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || caja.estado.toString() === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleCreateCaja = async (data: CajaCreate) => {
    if (!canOpenCaja) return;
    try {
      await createCaja(data);
    } catch (error) {
      logger.captureException(error, { context: 'CashRegister:handleCerrarCaja' });
    }
  };

  const handleCerrarCaja = async (data: CajaCierre) => {
    try {
      await cerrarCaja(data);
    } catch (error) {
      logger.captureException(error, { context: 'CashRegister:handleCreateCaja' });
    }
  };

  const handleViewDetails = (caja: CajaWithUser) => {
    setSelectedCaja(caja);
    setShowDetails(true);
  };

  const handleCloseCaja = (caja: CajaWithUser) => {
    if (!canCloseCaja) return;
    setSelectedCaja(caja);
    setShowCerrarDialog(true);
  };

  const handleRetirar = (caja: CajaWithUser) => {
    setSelectedCaja(caja);
    setShowRetiroDialog(true);
  };

  const handleRetirarDinero = async (data: CajaRetiro) => {
    try {
      const success = await retirarDinero(data);
      return success;
    } catch (error) {
      logger.captureException(error, { context: 'CashRegister:handleRetirarDinero' });
      return false;
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  const handleRefresh = () => {
    getCajas();
    getResumen();
  };

  useEffect(() => {
    const refreshFromEvent = () => {
      getCajas();
      getResumen();
    };
    const u1 = appEventBus.on('cajaClosed', refreshFromEvent);
    const u2 = appEventBus.on('cajaOpened', refreshFromEvent);
    return () => {
      u1();
      u2();
    };
  }, [getCajas, getResumen]);

  if (error) {
    return (
      <div className='p-6 min-h-[60vh] flex items-center justify-center'>
        <Card className='max-w-md w-full border-none shadow-2xl bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 text-center'>
          <div className='w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-4xl flex items-center justify-center mx-auto mb-6'>
            <AlertTriangle className='h-10 w-10 text-rose-500' />
          </div>
          <h3 className='text-2xl font-black text-slate-900 dark:text-white mb-2'>
            ¡Ups! Algo salió mal
          </h3>
          <p className='text-slate-500 dark:text-slate-400 mb-8'>{error}</p>
          <Button
            onClick={handleRefresh}
            className='w-full h-12 rounded-2xl bg-black text-white hover:scale-[1.02] active:scale-95 transition-all font-bold'
          >
            <RotateCcw className='h-4 w-4 mr-2' />
            Reintentar Carga
          </Button>
        </Card>
      </div>
    );
  }

  const openCajasCount = cajas.filter(c => c.estado === 1).length;

  return (
    <PermissionGuard module='cash_register' action='view'>
      <div className='w-full p-4 sm:p-6 lg:p-10 space-y-8 mt-4 sm:mt-6 lg:mt-10'>
        {}
        <div className='flex flex-col md:flex-row justify-between items-start md:items-center gap-6'>
          <div className='space-y-1'>
            <h1 className='text-3xl lg:text-4xl font-black tracking-tighter text-slate-900 dark:text-white'>
              {isCajero ? 'Mi Caja' : 'Control de Cajas'}
            </h1>
            <p className='text-slate-500 font-medium'>
              {isCajero
                ? 'Monitorea y gestiona tus transacciones diarias'
                : 'Administración centralizada de flujos de efectivo'}
            </p>
          </div>

          <div className='flex flex-col sm:flex-row gap-3 w-full sm:w-auto'>
            {openCajasCount > 0 ? (
              <div className='flex items-center gap-3 pl-4 pr-6 py-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-2xl shadow-xs animate-pulse'>
                <div className='bg-amber-100 dark:bg-amber-500/20 p-2 rounded-xl'>
                  <Info className='h-4 w-4 text-amber-600' />
                </div>
                <span className='text-xs font-bold text-amber-700 dark:text-amber-500 uppercase tracking-tight'>
                  {openCajasCount} caja{openCajasCount > 1 ? 's' : ''} abierta
                  {openCajasCount > 1 ? 's' : ''}
                </span>
              </div>
            ) : (
              canOpenCaja && <CajaFormDialog onCajaCreated={handleCreateCaja} loading={loading} />
            )}
          </div>
        </div>

        {}
        <CashRegisterStatsCard isCajero={isCajero} />

        {}
        <div className='space-y-8'>
          {!isCajero && (
            <div className='flex justify-center gap-3 border-b pb-1'>
              <button
                onClick={() => setCashierTab('cajas')}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
                  cashierTab === 'cajas'
                    ? 'bg-amber-100 text-amber-700 rounded-full shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 rounded-full'
                }`}
              >
                Listado de Cajas
              </button>
              <button
                onClick={() => setCashierTab('resumen')}
                className={`flex items-center gap-2 px-5 py-2 text-sm font-semibold transition-all ${
                  cashierTab === 'resumen'
                    ? 'bg-green-100 text-green-700 rounded-full shadow-xs'
                    : 'text-gray-500 hover:bg-gray-100 rounded-full'
                }`}
              >
                Análisis Global
              </button>
            </div>
          )}

          <div className='space-y-6 outline-hidden'>
            {!isCajero && (
              <CajaFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterStatus={filterStatus}
                onStatusChange={setFilterStatus}
                onClearFilters={handleClearFilters}
              />
            )}

            <BoneyardSkeleton name='cash-register-main' loading={loading}>
              {filteredCajas.length === 0 ? (
                <div className='flex flex-col items-center justify-center py-20 text-center space-y-6'>
                  <div className='w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-[2.5rem] flex items-center justify-center'>
                    <Wallet className='h-12 w-12 text-slate-300' />
                  </div>
                  <div className='space-y-2'>
                    <h3 className='text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter'>
                      {searchTerm || filterStatus !== 'all'
                        ? 'Sin coincidencias'
                        : 'Sin cajas activas'}
                    </h3>
                    <p className='text-slate-500 font-medium max-w-sm mx-auto'>
                      {searchTerm || filterStatus !== 'all'
                        ? 'No encontramos lo que buscas con los filtros actuales.'
                        : 'Todavía no hay registros en el sistema. ¡Abre una nueva caja para empezar!'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className='grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3'>
                  {filteredCajas.map(caja => (
                    <CajaCard
                      key={caja.id_caja}
                      caja={caja}
                      onViewDetails={handleViewDetails}
                      onCloseCaja={handleCloseCaja}
                      onRetirar={handleRetirar}
                      canCloseCaja={canCloseCaja}
                      canRetirar={canWithdrawMoney}
                      canViewDetails={canViewDetails}
                    />
                  ))}
                </div>
              )}
            </BoneyardSkeleton>
          </div>

          {cashierTab === 'resumen' && !isCajero && (
            <div className='outline-hidden'>
              <CashRegisterDetailedStats />
            </div>
          )}
        </div>

        {}
        <CerrarCajaDialog
          caja={selectedCaja}
          open={showCerrarDialog}
          onOpenChange={setShowCerrarDialog}
          onCerrarCaja={handleCerrarCaja}
          loading={loading}
        />

        <RetiroDineroDialog
          caja={selectedCaja}
          open={showRetiroDialog}
          onOpenChange={setShowRetiroDialog}
          onRetirar={handleRetirarDinero}
          loading={loading}
          mutationError={mutationError}
        />

        {showDetails && selectedCaja && (
          <DynamicCajaDetails
            caja={selectedCaja}
            open={showDetails}
            onOpenChange={setShowDetails}
          />
        )}
      </div>
    </PermissionGuard>
  );
}
