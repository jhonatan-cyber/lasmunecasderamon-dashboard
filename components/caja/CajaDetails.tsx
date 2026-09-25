'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';

import { Skeleton } from '@/components/ui/skeleton';
import logger from '@/lib/utils/logger';

import { X, Calendar, Printer, Download, ChevronDown, BarChart3 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useUserImage } from '@/contexts/UserImageContext';
import { useCajaDetails } from './hooks/useCajaDetails';
import {
  CajaPaymentSummary,
  CajaSummaryMetrics,
  CajaChartsSection,
  CajaFinancialDetails,
  CajaVentasTable,
  CajaServiciosTable,
  CajaRetirosList,
  ClientesSaldoList
} from '@/components/caja/details';
import { generatePrintContent, getPDFData, exportToPDF } from '@/components/caja/cajaExportUtils';
import { formatCurrencyNoDecimals, formatFechaLarga, formatSoloHora } from '@/lib/utils/formatters';

const printStyles = `
  @media print {
    .print\\:overflow-visible {
      overflow: visible !important;
    }
    .print\\:max-h-none {
      max-height: none !important;
    }
    .print\\:block-all {
      display: block !important;
    }
    .print\\:show-all .TableBody {
      display: table-row-group !important;
    }
    .print\\:show-all .TableRow {
      display: table-row !important;
    }
    .print\\:hidden {
      display: none !important;
    }
  }
`;

const getDiaSemana = (fecha: string | Date): string => {
  const date = new Date(fecha);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return dias[date.getDay()];
};

interface CajaDetailsProps {
  caja: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CajaDetails({ caja, open, onOpenChange }: CajaDetailsProps) {
  const { imageVersion } = useUserImage();
  const details = useCajaDetails({ caja, open });
  const [statsOpen, setStatsOpen] = useState(true);

  if (!caja) return null;

  const cajaActual = details.cajaInfo ?? caja;

  const {
    ventas,
    retiros,
    servicios,
    cajaInfo,
    clientesSaldo,
    loadingClientesSaldo,
    loadingVentas,
    retirosLoading,
    loadingServicios,
    ventasTragosChicas,
    ventasChampagne,
    ventasBarras,
    searchVentas,
    setSearchVentas,
    searchServicios,
    setSearchServicios,
    ventasPage,
    setVentasPage,
    serviciosPage,
    setServiciosPage,
    retirosPage,
    setRetirosPage,
    activeTab,
    setActiveTab,
    filteredVentas,
    filteredServicios,
    fetchRetiros,
    fetchResumenFinanciero,
    fetchVentas,
    fetchServicios,
    isLoadingSummary,
    getVentasForDisplay,
    getServiciosForDisplay,
    getRetirosForDisplay,
    totalPages
  } = details;

  const totalPropinas =
    Number(ventasTragosChicas?.propinas || 0) +
    Number(ventasChampagne?.propinas || 0) +
    Number(ventasBarras?.propinas || 0);
  const totalVentas =
    Number(ventasTragosChicas?.total_venta || 0) +
    Number(ventasChampagne?.total_venta || 0) +
    Number(ventasBarras?.total_venta || 0);
  const totalCargoTarjeta =
    Number(ventasTragosChicas?.cargo_tarjeta || 0) +
    Number(ventasChampagne?.cargo_tarjeta || 0) +
    Number(ventasBarras?.cargo_tarjeta || 0);
  const totalIngresos = totalVentas + totalCargoTarjeta + Number(caja?.servicios || 0);
  const ingresosReales =
    Number(caja?.efectivo || 0) + Number(caja?.tarjeta || 0) + Number(caja?.transferencia || 0);
  const efectivoCaja = Number(caja?.efectivo || 0);
  const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
  const tarjetaCaja = Number(caja?.tarjeta || 0);
  const transferenciaCaja = Number(caja?.transferencia || 0);
  const prepagoCargado = Number(cajaActual?.prepago_cargado || 0);
  const prepagoConsumido = Number(cajaActual?.prepago_consumido || 0);
  const prepagoPendienteClientes = Number(cajaActual?.prepago_pendiente_clientes || 0);
  const totalEgresos =
    Number(caja?.devoluciones || 0) +
    Number(caja?.anticipo || 0) +
    retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0);
  const efectivoNeto = efectivoTotal - totalEgresos;
  const totalMetodosPago = efectivoTotal + tarjetaCaja + transferenciaCaja;
  const totalReal = efectivoNeto + tarjetaCaja + transferenciaCaja;
  const distribucionDinero = [
    { concepto: 'Efectivo neto', monto: efectivoNeto },
    { concepto: 'Tarjeta', monto: tarjetaCaja },
    { concepto: 'Transferencia', monto: transferenciaCaja },
    { concepto: 'Subtotal antes de egresos', monto: totalMetodosPago }
  ];

  const estadoInfo =
    caja.estado === 1
      ? { label: 'En curso', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-200' }
      : { label: 'Cerrada', color: 'bg-slate-500/10 text-slate-600 border-slate-200' };

  const getCajaExportContext = () => ({
    caja,
    activeTab,
    estadoInfo,
    filteredVentas,
    filteredServicios,
    retiros,
    ventasTragosChicas,
    ventasChampagne,
    ventasBarras,
    totalCargoTarjeta,
    prepagoCargado,
    prepagoConsumido,
    ingresosReales,
    efectivoNeto,
    tarjetaCaja,
    transferenciaCaja,
    totalMetodosPago,
    totalReal,
    distribucionDinero
  });

  const handlePrint = () => {
    const printContent = generatePrintContent(getCajaExportContext());
    // Use Blob URL instead of document.write() for security and CSP compliance
    const blob = new Blob([printContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
        URL.revokeObjectURL(url);
      };
      // Fallback if onload doesn't fire (e.g., already loaded)
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  };

  return (
    <>
      <style>{printStyles}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0 w-[95vw] overflow-hidden rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 print:max-w-full print:w-full print:h-auto print:overflow-visible print:max-h-none'>
          <DialogHeader className='p-6 pb-2 border-b shrink-0 bg-white dark:bg-slate-900 print:hidden'>
            <div className='flex items-center justify-between'>
              <DialogTitle className='text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4'>
                <Calendar className='w-5 h-5 text-gray-500' />
                Detalles de Caja - {getDiaSemana(caja.fecha_apertura)}{' '}
                <Badge
                  variant='secondary'
                  className={`${estadoInfo.color} rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border shadow-xs`}
                >
                  {estadoInfo.label}
                </Badge>
              </DialogTitle>
              <div className='flex items-center gap-3 ml-auto'>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full gap-2'
                  onClick={handlePrint}
                >
                  <Printer className='w-4 h-4' />
                  <span className='hidden sm:inline'>Imprimir</span>
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  className='rounded-full gap-2'
                  onClick={() => exportToPDF(getCajaExportContext())}
                >
                  <Download className='w-4 h-4' />
                  <span className='hidden sm:inline'>Exportar PDF</span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-gray-100 dark:border-gray-800 px-6 py-4 print:hidden'>
            <div className='flex items-center justify-between gap-4'>
              <button
                type='button'
                onClick={() => setStatsOpen(prev => !prev)}
                className='flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors'
                aria-expanded={statsOpen}
              >
                <div className='p-1.5 bg-slate-100 dark:bg-white/10 rounded-lg'>
                  <BarChart3 className='w-4 h-4' />
                </div>
                Estadísticas
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${statsOpen ? 'rotate-180' : ''}`}
                />
              </button>

              {!statsOpen && (
                <div className='flex items-center gap-4 sm:gap-6 text-sm'>
                  <div className='text-right'>
                    <p className='text-[10px] font-bold text-slate-400 uppercase'>Efectivo</p>
                    <p className='font-black tabular-nums text-slate-700 dark:text-slate-200'>
                      {formatCurrencyNoDecimals(efectivoNeto)}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] font-bold text-slate-400 uppercase'>Egresos</p>
                    <p className='font-black tabular-nums text-rose-600'>
                      {formatCurrencyNoDecimals(totalEgresos)}
                    </p>
                  </div>
                  <div className='text-right'>
                    <p className='text-[10px] font-bold text-slate-400 uppercase'>Total real</p>
                    <p className='font-black tabular-nums text-emerald-600'>
                      {formatCurrencyNoDecimals(totalReal)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {statsOpen && (
              <div className='space-y-4 mt-3'>
                <CajaPaymentSummary
                  isLoading={isLoadingSummary}
                  efectivoNeto={efectivoNeto}
                  tarjetaCaja={tarjetaCaja}
                  transferenciaCaja={transferenciaCaja}
                />

                <CajaSummaryMetrics
                  isLoading={isLoadingSummary}
                  totalMetodosPago={totalMetodosPago}
                  totalEgresos={totalEgresos}
                  totalReal={totalReal}
                />
              </div>
            )}
          </div>

          <div className='flex-1 flex flex-col min-h-0'>
            <div className='flex justify-center gap-2 mx-6 mt-4 border-b pb-1 print:hidden'>
              <button
                onClick={() => setActiveTab('resumen')}
                className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
                  activeTab === 'resumen'
                    ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('ventas')}
                className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
                  activeTab === 'ventas'
                    ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Ventas ({ventas.length})
              </button>
              <button
                onClick={() => setActiveTab('servicios')}
                className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
                  activeTab === 'servicios'
                    ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Servicios ({servicios.length})
              </button>
              <button
                onClick={() => setActiveTab('retiros')}
                className={`px-4 py-2 text-sm font-semibold transition-all rounded-full ${
                  activeTab === 'retiros'
                    ? 'bg-gray-900 text-white shadow-xs dark:bg-white dark:text-black'
                    : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                Retiros ({retiros.length})
              </button>
            </div>

            <div className='flex-1 overflow-y-auto custom-scrollbar p-6 print:overflow-visible print:max-h-none'>
              {activeTab === 'resumen' && (
                <div className='mt-0 space-y-8'>
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2'>
                    <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                      <div className='mb-3'>
                        <p className='text-xs font-bold text-gray-500 uppercase mb-2'>
                          Abierta por
                        </p>
                        <div className='flex items-center gap-2'>
                          <Avatar className='h-8 w-8'>
                            {caja.cajero_foto && caja.cajero_foto !== '' ? (
                              <Image
                                src={`/img/users/${caja.cajero_foto}?v=${imageVersion}`}
                                alt={caja.cajero_nombre || 'Usuario'}
                                width={32}
                                height={32}
                                className='w-full h-full object-cover rounded-full'
                              />
                            ) : (
                              <AvatarImage
                                src='/img/users/default.png'
                                alt={caja.cajero_nombre || 'Usuario'}
                              />
                            )}
                            <AvatarFallback className='bg-emerald-100 text-emerald-700 font-bold text-xs'>
                              {caja.cajero_nombre?.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <p className='font-bold text-gray-900 dark:text-white'>
                            {caja.cajero_nombre || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <p className='text-sm text-gray-600 dark:text-gray-400'>
                        {formatFechaLarga(caja.fecha_apertura)} •{' '}
                        {formatSoloHora(caja.fecha_apertura)}
                      </p>
                    </div>
                    {caja.fecha_cierre && (
                      <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                        <div className='mb-3'>
                          <p className='text-xs font-bold text-gray-500 uppercase mb-2'>
                            Cerrada por
                          </p>
                          <div className='flex items-center gap-2'>
                            <Avatar className='h-8 w-8'>
                              {caja.cajero_cierre_foto && caja.cajero_cierre_foto !== '' ? (
                                <Image
                                  src={`/img/users/${caja.cajero_cierre_foto}?v=${imageVersion}`}
                                  alt={caja.cajero_cierre_nombre || 'Usuario'}
                                  width={32}
                                  height={32}
                                  className='w-full h-full object-cover rounded-full'
                                />
                              ) : (
                                <AvatarImage
                                  src='/img/users/default.png'
                                  alt={caja.cajero_cierre_nombre || 'Usuario'}
                                />
                              )}
                              <AvatarFallback className='bg-slate-100 text-slate-700 font-bold text-xs'>
                                {caja.cajero_cierre_nombre?.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <p className='font-bold text-gray-900 dark:text-white'>
                              {caja.cajero_cierre_nombre || 'N/A'}
                            </p>
                          </div>
                        </div>
                        <p className='text-sm text-gray-600 dark:text-gray-400'>
                          {formatFechaLarga(caja.fecha_cierre)} •{' '}
                          {formatSoloHora(caja.fecha_cierre)}
                        </p>
                      </div>
                    )}
                  </div>

                  <CajaChartsSection
                    isLoading={isLoadingSummary}
                    totalIngresos={totalIngresos}
                    totalEgresos={totalEgresos}
                    ventasTragos={ventasTragosChicas?.total_venta || 0}
                    ventasChampagne={ventasChampagne?.total_venta || 0}
                    ventasBarras={ventasBarras?.total_venta || 0}
                    servicios={caja?.servicios || 0}
                  />

                  <CajaFinancialDetails
                    isLoading={isLoadingSummary}
                    efectivoNeto={efectivoNeto}
                    ventasTragos={ventasTragosChicas?.total_venta || 0}
                    ventasChampagne={ventasChampagne?.total_venta || 0}
                    ventasBarras={ventasBarras?.total_venta || 0}
                    servicios={caja?.servicios || 0}
                    prepagoCargado={prepagoCargado}
                    prepagoConsumido={prepagoConsumido}
                    ingresosReales={ingresosReales}
                    devoluciones={Number(caja?.devoluciones || 0)}
                    anticipos={Number(caja?.anticipo || 0)}
                    retirosTotal={retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0)}
                    totalReal={totalReal}
                    prepagoPendienteClientes={prepagoPendienteClientes}
                  />

                  <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden'>
                    <div className='p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between'>
                      <h4 className='font-bold text-gray-900 dark:text-white'>
                        Clientes con saldo prepago pendiente
                      </h4>
                      <span className='text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider'>
                        {clientesSaldo.length} cliente{clientesSaldo.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className='p-4'>
                      <ClientesSaldoList clientes={clientesSaldo} loading={loadingClientesSaldo} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'ventas' && (
                <div className='mt-0 space-y-4'>
                  <CajaVentasTable
                    loading={loadingVentas}
                    ventas={ventas}
                    filteredVentas={filteredVentas}
                    search={searchVentas}
                    onSearchChange={setSearchVentas}
                    getRows={getVentasForDisplay}
                    page={ventasPage}
                    totalPages={totalPages(filteredVentas)}
                    onPageChange={setVentasPage}
                    onRetry={fetchVentas}
                  />
                </div>
              )}

              {activeTab === 'servicios' && (
                <div className='mt-0 space-y-4'>
                  <CajaServiciosTable
                    loading={loadingServicios}
                    servicios={servicios}
                    filteredServicios={filteredServicios}
                    search={searchServicios}
                    onSearchChange={setSearchServicios}
                    getRows={getServiciosForDisplay}
                    page={serviciosPage}
                    totalPages={totalPages(filteredServicios)}
                    onPageChange={setServiciosPage}
                  />
                </div>
              )}

              {activeTab === 'retiros' && (
                <div className='mt-0 space-y-4'>
                  <CajaRetirosList
                    loading={retirosLoading}
                    retiros={retiros}
                    getRows={getRetirosForDisplay}
                    page={retirosPage}
                    totalPages={totalPages(retiros)}
                    onPageChange={setRetirosPage}
                  />
                </div>
              )}
            </div>
          </div>

          <div className='shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center px-6 rounded-b-2xl print:hidden'>
            <Button
              variant='outline'
              size='sm'
              className='rounded-full px-8 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200 font-bold gap-2'
              onClick={() => onOpenChange(false)}
            >
              <X className='w-4 h-4' />
              Cerrar Detalles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
