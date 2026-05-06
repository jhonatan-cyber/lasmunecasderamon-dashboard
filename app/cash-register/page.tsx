'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCashRegister } from '@/hooks/caja/useCashRegister';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { CajaCard } from '@/components/caja/CajaCard';
import { CajaFormDialog } from '@/components/caja/CajaFormDialog';
import { CerrarCajaDialog } from '@/components/caja/CerrarCajaDialog';
import { RetiroDineroDialog } from '@/components/caja/RetiroDineroDialog';
import dynamic from 'next/dynamic';
const CajaDetails = dynamic(() => import('@/components/caja/CajaDetails'), { ssr: false });
import { CajaFilters } from '@/components/caja/CajaFilters';
import { CashRegisterStatsCard, CashRegisterDetailedStats } from '@/components/cash-register';
import { CajaWithUser, CajaCreate, CajaCierre, CajaRetiro } from '@/types/caja';
import { AlertTriangle, RotateCcw, Wallet, Plus, Info } from 'lucide-react';
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function CashRegister() {
  const { cajas, loading, error, getCajas, getResumen, createCaja, cerrarCaja, retirarDinero, mutationError } =
    useCashRegister();
  const { user } = useCurrentUser();
  const { hasPermission } = useUserPermissions();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCaja, setSelectedCaja] = useState<CajaWithUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);
  const [showRetiroDialog, setShowRetiroDialog] = useState(false);

  // Verificar si el usuario es cajero
  const isCajero = user?.role === 'cajero';

  // Verificar permisos específicos
  const canOpenCaja = hasPermission('cash_register', 'open');
  const canCloseCaja = hasPermission('cash_register', 'close');
  const canViewDetails = hasPermission('cash_register', 'view_details');
  const canWithdrawMoney = hasPermission('cash_register', 'withdraw');

  // Filtrar cajas
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
      console.error('Error al crear caja:', error);
    }
  };

  const handleCerrarCaja = async (data: CajaCierre) => {
    try {
      await cerrarCaja(data);
    } catch (error) {
      console.error('Error al cerrar caja:', error);
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
      console.error('Error al retirar dinero:', error);
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
    window.addEventListener('cajaClosed', refreshFromEvent);
    window.addEventListener('cajaOpened', refreshFromEvent);
    return () => {
      window.removeEventListener('cajaClosed', refreshFromEvent);
      window.removeEventListener('cajaOpened', refreshFromEvent);
    };
  }, [getCajas, getResumen]);

  if (error) {
    return (
      <div className='p-6 min-h-[60vh] flex items-center justify-center'>
        <Card className='max-w-md w-full border-none shadow-2xl bg-white/80 dark:bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] p-8 text-center'>
          <div className='w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6'>
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
        {/* Header Section */}
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
              <div className='flex items-center gap-3 pl-4 pr-6 py-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-100 dark:border-amber-500/10 rounded-2xl shadow-sm animate-pulse'>
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

        {/* Stats Section */}
        <CashRegisterStatsCard isCajero={isCajero} />

        {/* Main Content Sections */}
        <Tabs defaultValue='cajas' className='space-y-8'>
          {!isCajero && (
            <div className='flex justify-center w-full'>
              <TabsList className='inline-flex p-1 bg-transparent rounded-3xl'>
                <TabsTrigger
                  value='cajas'
                  className='rounded-2xl px-8 py-2.5 text-sm font-bold data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-xl transition-all'
                >
                  Listado de Cajas
                </TabsTrigger>
                <TabsTrigger
                  value='resumen'
                  className='rounded-2xl px-8 py-2.5 text-sm font-bold data-[state=active]:bg-black data-[state=active]:text-white data-[state=active]:shadow-xl transition-all'
                >
                  Análisis Global
                </TabsTrigger>
              </TabsList>
            </div>
          )}

          <TabsContent value='cajas' className='space-y-6 outline-none'>
            {!isCajero && (
              <CajaFilters
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterStatus={filterStatus}
                onStatusChange={setFilterStatus}
                onClearFilters={handleClearFilters}
              />
            )}

            {loading ? (
              <div className='grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3'>
                {[...Array(6)].map((_, i) => (
                  <Card
                    key={i}
                    className='border border-slate-100 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900/40 rounded-[2rem] overflow-hidden p-8 space-y-6'
                  >
                    <div className='flex justify-between items-start'>
                      <div className='space-y-2'>
                        <Skeleton className='h-6 w-32 rounded-lg' />
                        <Skeleton className='h-4 w-24 rounded-lg' />
                      </div>
                      <Skeleton className='h-8 w-20 rounded-full' />
                    </div>
                    <Skeleton className='h-24 w-full rounded-2xl' />
                    <Skeleton className='h-12 w-full rounded-2xl' />
                  </Card>
                ))}
              </div>
            ) : filteredCajas.length === 0 ? (
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
          </TabsContent>

          <TabsContent value='resumen' className='outline-none'>
            <CashRegisterDetailedStats />
          </TabsContent>
        </Tabs>

        {/* Dialogs */}
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
          <CajaDetails caja={selectedCaja} open={showDetails} onOpenChange={setShowDetails} />
        )}
      </div>
    </PermissionGuard>
  );
}
