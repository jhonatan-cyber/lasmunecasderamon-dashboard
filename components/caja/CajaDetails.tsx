'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useUserImage } from '@/contexts/UserImageContext';
import { useCajaDetailsView } from '@/components/caja/hooks/useCajaDetailsView';
import {
  CajaVentasTable,
  CajaServiciosTable,
  CajaRetirosList,
  CajaDetailsHeader,
  CajaDetailsStatsBar,
  CajaDetailsTabs,
  CajaDetailsResumenTab
} from '@/components/caja/details';
import { printStyles } from '@/components/caja/details/cajaDetailsPrint';

interface CajaDetailsProps {
  caja: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal de detalles de una caja. Antes monolítico (519 líneas); ahora compone:
 *  - `useCajaDetailsView` → datos de `useCajaDetails` + números derivados,
 *    estado, contexto de exportación (Imprimir/PDF) y colapso de estadísticas
 *  - subcomponentes presentacionales en `components/caja/details/`
 * API pública intacta: `components/caja/index.ts` sigue exportando el default
 * y `app/cash-register/page.tsx` no cambia.
 */
export default function CajaDetails({ caja, open, onOpenChange }: CajaDetailsProps) {
  const { imageVersion } = useUserImage();
  const view = useCajaDetailsView({ caja, open });

  if (!view) return null;

  return (
    <>
      <style>{printStyles}</style>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0 w-[95vw] overflow-hidden rounded-2xl border-none shadow-2xl bg-white dark:bg-slate-900 print:max-w-full print:w-full print:h-auto print:overflow-visible print:max-h-none'>
          <CajaDetailsHeader
            fechaApertura={caja.fecha_apertura}
            estadoInfo={view.estadoInfo}
            cierrePendiente={view.cierrePendiente}
            onReenviarAviso={view.handleReenviarAviso}
            reenviandoAviso={view.reenviandoAviso}
            onReabrirCierre={view.handleReabrirCierre}
            reabriendoCierre={view.reabriendoCierre}
            onPrint={view.handlePrint}
            onExportPdf={view.exportPdf}
            onSendWhatsApp={view.canSendWhatsApp ? view.handleSendWhatsApp : undefined}
            sendingWhatsApp={view.sendingWhatsApp}
          />

          <CajaDetailsStatsBar
            statsOpen={view.statsOpen}
            onToggle={() => view.setStatsOpen(prev => !prev)}
            numeros={view.numeros}
            isLoadingSummary={view.isLoadingSummary}
          />

          <div className='flex-1 flex flex-col min-h-0'>
            <CajaDetailsTabs
              activeTab={view.activeTab}
              onTabChange={view.setActiveTab}
              counts={view.tabCounts}
            />

            <div className='flex-1 overflow-y-auto custom-scrollbar p-6 print:overflow-visible print:max-h-none'>
              {view.activeTab === 'resumen' && (
                <CajaDetailsResumenTab
                  caja={caja}
                  imageVersion={imageVersion}
                  isLoadingSummary={view.isLoadingSummary}
                  numeros={view.numeros}
                  retirosSum={view.retirosSum}
                  clientesSaldo={view.clientesSaldo}
                  loadingClientesSaldo={view.loadingClientesSaldo}
                  fuentes={view.fuentes}
                  ventasPorProducto={view.ventasPorProducto}
                />
              )}

              {view.activeTab === 'ventas' && (
                <div className='mt-0 space-y-4'>
                  <CajaVentasTable
                    loading={view.loadingVentas}
                    ventas={view.ventas}
                    filteredVentas={view.filteredVentas}
                    search={view.searchVentas}
                    onSearchChange={view.setSearchVentas}
                    getRows={view.getVentasForDisplay}
                    page={view.ventasPage}
                    totalPages={view.totalPages(view.filteredVentas)}
                    onPageChange={view.setVentasPage}
                    onRetry={view.fetchVentas}
                  />
                </div>
              )}

              {view.activeTab === 'servicios' && (
                <div className='mt-0 space-y-4'>
                  <CajaServiciosTable
                    loading={view.loadingServicios}
                    servicios={view.servicios}
                    filteredServicios={view.filteredServicios}
                    search={view.searchServicios}
                    onSearchChange={view.setSearchServicios}
                    getRows={view.getServiciosForDisplay}
                    page={view.serviciosPage}
                    totalPages={view.totalPages(view.filteredServicios)}
                    onPageChange={view.setServiciosPage}
                  />
                </div>
              )}

              {view.activeTab === 'retiros' && (
                <div className='mt-0 space-y-4'>
                  <CajaRetirosList
                    loading={view.retirosLoading}
                    retiros={view.retiros}
                    getRows={view.getRetirosForDisplay}
                    page={view.retirosPage}
                    totalPages={view.totalPages(view.retiros)}
                    onPageChange={view.setRetirosPage}
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
