'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import logger from '@/lib/utils/logger';

import { X, Calendar, Printer, Download } from 'lucide-react';
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
  CajaRetirosList
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

  if (!caja) return null;

  const {
    ventas,
    retiros,
    servicios,
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
  const totalIngresos = totalVentas + Number(caja?.servicios || 0);
  const ingresosReales =
    Number(caja?.efectivo || 0) + Number(caja?.tarjeta || 0) + Number(caja?.transferencia || 0);
  const efectivoCaja = Number(caja?.efectivo || 0);
  const efectivoTotal = Number(caja?.monto_apertura || 0) + Number(caja?.efectivo || 0);
  const tarjetaCaja = Number(caja?.tarjeta || 0);
  const transferenciaCaja = Number(caja?.transferencia || 0);
  const prepagoCargado = Number(caja?.prepago_cargado || 0);
  const prepagoConsumido = Number(caja?.prepago_consumido || 0);
  const prepagoPendienteClientes = Number(caja?.prepago_pendiente_clientes || 0);
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
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: printStyles }} />
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0 w-[95vw] overflow-hidden rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 print:max-w-full print:w-full print:h-auto print:overflow-visible print:max-h-none'>
          <DialogHeader className='p-6 pb-2 border-b flex-shrink-0 bg-white dark:bg-slate-900 print:hidden'>
            <div className='flex items-center justify-between'>
              <DialogTitle className='text-xl font-bold text-slate-900 dark:text-white flex items-center gap-4'>
                <Calendar className='w-5 h-5 text-gray-500' />
                Detalles de Caja - {getDiaSemana(caja.fecha_apertura)}{' '}
                <Badge
                  variant='secondary'
                  className={`${estadoInfo.color} rounded-xl px-4 py-1 text-xs font-black uppercase tracking-widest border shadow-sm`}
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

          <div className='sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-6 py-4 print:hidden'>
            <div className='space-y-4'>
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
          </div>

          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='flex-1 flex flex-col min-h-0'
          >
            <TabsList className='mx-6 mt-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl print:hidden'>
              <TabsTrigger
                value='resumen'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Resumen
              </TabsTrigger>
              <TabsTrigger
                value='ventas'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Ventas ({ventas.length})
              </TabsTrigger>
              <TabsTrigger
                value='servicios'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Servicios ({servicios.length})
              </TabsTrigger>
              <TabsTrigger
                value='retiros'
                className='rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm'
              >
                Retiros ({retiros.length})
              </TabsTrigger>
            </TabsList>

            <div className='flex-1 overflow-y-auto custom-scrollbar p-6 print:overflow-visible print:max-h-none'>
              <TabsContent value='resumen' className='mt-0 space-y-8'>
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2'>
                  <div className='bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-200 dark:border-gray-700'>
                    <div className='mb-3'>
                      <p className='text-xs font-bold text-gray-500 uppercase mb-2'>Abierta por</p>
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
                        {formatFechaLarga(caja.fecha_cierre)} • {formatSoloHora(caja.fecha_cierre)}
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
              </TabsContent>

              <TabsContent value='ventas' className='mt-0 space-y-4'>
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
              </TabsContent>

              <TabsContent value='servicios' className='mt-0 space-y-4'>
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
              </TabsContent>

              <TabsContent value='retiros' className='mt-0 space-y-4'>
                <CajaRetirosList
                  loading={retirosLoading}
                  retiros={retiros}
                  getRows={getRetirosForDisplay}
                  page={retirosPage}
                  totalPages={totalPages(retiros)}
                  onPageChange={setRetirosPage}
                />
              </TabsContent>
            </div>
          </Tabs>

          <div className='flex-shrink-0 border-t border-slate-100 dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-900/50 flex justify-center px-6 rounded-b-2xl print:hidden'>
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
