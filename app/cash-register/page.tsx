'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCashRegister } from '@/hooks/useCashRegister';
import { CajaCard } from '@/components/caja/CajaCard';
import { CajaFormDialog } from '@/components/caja/CajaFormDialog';
import { CerrarCajaDialog } from '@/components/caja/CerrarCajaDialog';
import { CajaDetails } from '@/components/caja/CajaDetails';
import { CajaFilters } from '@/components/caja/CajaFilters';
import { CashRegisterStatsCard, CashRegisterDetailedStats } from '@/components/cash-register';
import { CajaWithUser, CajaCreate, CajaCierre } from '@/types/caja';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faRotate } from '@fortawesome/free-solid-svg-icons';

export default function CashRegister() {
  const { cajas, loading, error, getCajas, getResumen, createCaja, cerrarCaja } = useCashRegister();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCaja, setSelectedCaja] = useState<CajaWithUser | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCerrarDialog, setShowCerrarDialog] = useState(false);

  // Filtrar cajas
  const filteredCajas = cajas.filter(caja => {
    const matchesSearch =
      caja.cajero_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      caja.id_caja.toString().includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || caja.estado.toString() === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleCreateCaja = async (data: CajaCreate) => {
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
    setSelectedCaja(caja);
    setShowCerrarDialog(true);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
  };

  const handleRefresh = () => {
    getCajas();
    getResumen();
  };

  if (error) {
    return (
      <div className='p-4 sm:p-6'>
        <div className='flex items-center justify-center h-64'>
          <div className='text-center'>
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className='h-8 sm:h-12 w-8 sm:w-12 text-red-500 mx-auto mb-4'
            />
            <h3 className='text-base sm:text-lg font-medium text-gray-900 mb-2'>Error al cargar datos</h3>
            <p className='text-sm sm:text-base text-gray-600 mb-4'>{error}</p>
            <Button
              onClick={handleRefresh}
              size='sm'
              variant='outline'
              className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base'
            >
              <FontAwesomeIcon icon={faRotate} className='h-4 w-4 mr-2' />
              Reintentar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className='p-4 sm:p-6 lg:p-10 space-y-4 sm:space-y-6 mt-4 sm:mt-6 lg:mt-10'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6'>
        <div>
          <h1 className='text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900'>Control de Cajas</h1>
          <p className='text-sm sm:text-base text-gray-600'>Gestiona las cajas registradoras y transacciones</p>
        </div>
        <div className='flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto'>
          {cajas.filter(c => c.estado === 1).length > 0 ? (
            <div className='flex items-center gap-2 px-3 sm:px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-md'>
              <FontAwesomeIcon icon={faExclamationTriangle} className='h-4 w-4 text-yellow-600 flex-shrink-0' />
              <span className='text-xs sm:text-sm text-yellow-800'>
                Hay {cajas.filter(c => c.estado === 1).length} caja
                {cajas.filter(c => c.estado === 1).length > 1 ? 's' : ''} abierta
                {cajas.filter(c => c.estado === 1).length > 1 ? 's' : ''}. Cierre la caja actual
                antes de abrir una nueva.
              </span>
            </div>
          ) : (
            <CajaFormDialog onCajaCreated={handleCreateCaja} loading={loading} />
          )}
          <Button
            onClick={handleRefresh}
            disabled={loading}
            size='sm'
            variant='outline'
            className='rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto'
          >
            <FontAwesomeIcon
              icon={faRotate}
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <CashRegisterStatsCard />

      {/* Contenido principal */}
      <Tabs defaultValue='cajas' className='space-y-4 sm:space-y-6'>
        <TabsList className='grid w-full grid-cols-2'>
          <TabsTrigger
            value='cajas'
            className='rounded-full data-[state=active]:bg-black data-[state=active]:text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base'
          >
            Cajas Registradoras
          </TabsTrigger>
          <TabsTrigger
            value='resumen'
            className='rounded-full data-[state=active]:bg-black data-[state=active]:text-white hover:scale-105 transition-all duration-200 text-sm sm:text-base'
          >
            Resumen
          </TabsTrigger>
        </TabsList>

        <TabsContent value='cajas' className='space-y-4 sm:space-y-6'>
          <CajaFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterStatus={filterStatus}
            onStatusChange={setFilterStatus}
            onClearFilters={handleClearFilters}
          />

          {loading ? (
            <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
              {[...Array(6)].map((_, i) => (
                <Card key={i} className='shadow-sm'>
                  <CardHeader className='pb-4'>
                    <Skeleton className='h-6 w-32' />
                    <Skeleton className='h-4 w-24' />
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <Skeleton className='h-4 w-full' />
                    <Skeleton className='h-4 w-3/4' />
                    <Skeleton className='h-4 w-1/2' />
                    <Skeleton className='h-8 w-full' />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCajas.length === 0 ? (
            <div className='text-center py-8 sm:py-12'>
              <FontAwesomeIcon
                icon={faExclamationTriangle}
                className='h-8 sm:h-12 w-8 sm:w-12 text-gray-400 mx-auto mb-4'
              />
              <h3 className='text-base sm:text-lg font-medium text-gray-900 mb-2'>
                {searchTerm || filterStatus !== 'all'
                  ? 'No se encontraron cajas'
                  : 'No hay cajas registradas'}
              </h3>
              <p className='text-sm sm:text-base text-gray-600'>
                {searchTerm || filterStatus !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza creando una nueva caja'}
              </p>
            </div>
          ) : (
            <div className='grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'>
              {filteredCajas.map(caja => (
                <CajaCard
                  key={caja.id_caja}
                  caja={caja}
                  onViewDetails={handleViewDetails}
                  onCloseCaja={handleCloseCaja}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value='resumen' className='space-y-4 sm:space-y-6'>
          <CashRegisterDetailedStats />
        </TabsContent>
      </Tabs>

      {/* Diálogos */}
      <CerrarCajaDialog
        caja={selectedCaja}
        open={showCerrarDialog}
        onOpenChange={setShowCerrarDialog}
        onCerrarCaja={handleCerrarCaja}
        loading={loading}
      />

      <CajaDetails caja={selectedCaja} open={showDetails} onOpenChange={setShowDetails} />
    </div>
  );
}
