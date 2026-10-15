'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { BottleExtras } from '@/components/bar/transfer/BottleExtras';
import { ChampagneTiersEditor } from '@/components/bar/transfer/ChampagneTiers';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useTransferForm } from '@/hooks/shared/useTransferForm';
import { useTransferSubmit } from '@/hooks/shared/useTransferSubmit';
import { TransferItemSummary } from '@/components/bar/transfer/TransferItemSummary';
import { SavedConfigPanel } from '@/components/bar/transfer/SavedConfigPanel';
import { SaleTypeEditor } from '@/components/bar/transfer/SaleTypeEditor';
import { TransferFooter } from '@/components/bar/transfer/TransferFooter';
import { formatNumber, type TransferModalProps } from '@/components/bar/transfer/transferOptions';

// API pública intacta: los consumidores (bar/page, transfers/page, SalePrices,
// BarAnfitrionas y el test) siguen importando desde aquí.
export {
  esChampagne,
  formatMiles,
  formatNumber,
  parseSavedOptions
} from '@/components/bar/transfer/transferOptions';
export type { BarStockItem, TransferModalProps } from '@/components/bar/transfer/transferOptions';

/**
 * Modal de traspaso al bar. Antes monolítico (802 líneas); ahora compone:
 *  - `useTransferForm`    → estado, valores derivados y ciclo de apertura
 *  - `useTransferSubmit`  → validación y envío (ml por shot, champagne, POST)
 *  - subcomponentes presentacionales en `components/bar/transfer/`
 */
export function TransferModal({
  open,
  onOpenChange,
  item,
  onDone,
  endpoint = '/api/bar'
}: TransferModalProps) {
  const form = useTransferForm({ item, open });
  const { saving, handleSubmit, isSubmitting } = useTransferSubmit({
    item,
    form,
    endpoint,
    onOpenChange,
    onDone
  });

  // El modal no se cierra ni resetea mientras hay un traspaso en vuelo.
  const handleOpenChange = (value: boolean) => {
    if (isSubmitting()) return;
    if (!value) form.reset();
    onOpenChange(value);
  };

  const handleTierChange = (index: number, field: 'precio' | 'comision', value: string) =>
    form.setTiers(prev => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[92dvh] w-[calc(100vw_-_2rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl'>
        <DialogHeader className='shrink-0 border-b px-5 py-5 pr-12 sm:px-6'>
          <DialogTitle className='text-lg font-bold'>Transferir al bar</DialogTitle>
          <DialogDescription>
            Transfiere unidades de esta presentación desde bodega al bar.
          </DialogDescription>
        </DialogHeader>
        {!item ? null : (
          <form onSubmit={handleSubmit} className='flex min-h-0 flex-col'>
            <div className='min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6'>
              <div className='grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
                <section className='min-w-0 space-y-5 rounded-xl border bg-muted/20 p-4 lg:sticky lg:top-0 lg:self-start'>
                  <h2 className='text-sm font-semibold'>Unidades a transferir</h2>
                  <TransferItemSummary item={item} configuration={form} />

                  <div className='space-y-2'>
                    <label
                      htmlFor='transfer-quantity'
                      className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
                    >
                      Unidades completas a transferir al bar
                    </label>
                    <Input
                      id='transfer-quantity'
                      required
                      value={form.cantidad}
                      onChange={e => form.setCantidad(formatNumber(e.target.value))}
                      placeholder={`1 - ${form.disponible}`}
                      inputMode='numeric'
                      disabled={saving}
                      className='h-12'
                    />
                    {form.tieneConfig && !form.usarConfigGuardada && (
                      <Button
                        type='button'
                        variant='outline'
                        disabled={saving}
                        onClick={() => form.setEditarPrecios(false)}
                        className='w-full whitespace-normal rounded-full'
                      >
                        Usar configuración guardada
                      </Button>
                    )}
                  </div>
                </section>
                <section className='min-w-0 space-y-4'>
                  <h2 className='text-sm font-semibold'>Configuración de venta</h2>

                  {form.usarConfigGuardada &&
                    form.opcionesGuardadas.some(option => option.tipo === 'botella') && (
                      <div className='space-y-4'>
                        <BottleExtras
                          commission={form.comision}
                          maxHostesses={form.maxAnfitrionas}
                          onMaxHostesses={form.setMaxAnfitrionas}
                          accompaniment={form.acompanamientoBotella !== 'ninguno'}
                          onAccompaniment={checked => {
                            form.setAcompanamientoBotella(checked ? 'gaseosa' : 'ninguno');
                            form.setEditarPrecios(true);
                          }}
                          units={form.unidadesAcompanamiento}
                          onUnits={value => {
                            form.setUnidadesAcompanamiento(value);
                            form.setEditarPrecios(true);
                          }}
                          disabled={saving}
                        />
                        {Number(form.comision.replace(/\./g, '')) > 0 &&
                          Number(form.maxAnfitrionas || 1) >= 2 && (
                            <ChampagneTiersEditor
                              tiers={form.tiers}
                              saving={saving}
                              onTierChange={handleTierChange}
                            />
                          )}
                      </div>
                    )}
                  {form.usarConfigGuardada ? (
                    <SavedConfigPanel
                      opciones={form.opcionesGuardadas}
                      esChampagne={false}
                      tiers={form.tiers}
                      saving={saving}
                      shotMl={form.shotMl}
                      mlShotCliente={form.mlShotCliente}
                      mlShotAnfitriona={form.mlShotAnfitriona}
                      onMlShotClienteChange={form.setMlShotCliente}
                      onMlShotAnfitrionaChange={form.setMlShotAnfitriona}
                      onEditPrices={() => form.setEditarPrecios(true)}
                    />
                  ) : (
                    <SaleTypeEditor
                      mlAcompanamientoAnfitriona={form.mlAcompanamientoAnfitriona}
                      onMlAcompanamientoAnfitrionaChange={form.setMlAcompanamientoAnfitriona}

                      maxAnfitrionas={form.maxAnfitrionas}
                      onMaxAnfitrionasChange={form.setMaxAnfitrionas}
                      acompanamientoBotella={form.acompanamientoBotella}
                      unidadesAcompanamiento={form.unidadesAcompanamiento}
                      onAcompanamientoBotellaChange={form.setAcompanamientoBotella}
                      onUnidadesAcompanamientoChange={form.setUnidadesAcompanamiento}
                      tipos={form.tipos}
                      etiquetaShot={form.etiquetaShot}
                      precioVenta={form.precioVenta}
                      comision={form.comision}
                      precioShot={form.precioShot}
                      precioShotAnfitriona={form.precioShotAnfitriona}
                      comisionShot={form.comisionShot}
                      shotMl={form.shotMl}
                      mlShotCliente={form.mlShotCliente}
                      mlShotAnfitriona={form.mlShotAnfitriona}
                      esChampagne={false}
                      tiers={form.tiers}
                      saving={saving}
                      onTiposChange={form.setTipos}
                      onPrecioVentaChange={form.setPrecioVenta}
                      onComisionChange={form.setComision}
                      onPrecioShotChange={form.setPrecioShot}
                      onPrecioShotAnfitrionaChange={form.setPrecioShotAnfitriona}
                      onComisionShotChange={form.setComisionShot}
                      preciosAnfitrionaExtra={form.preciosAnfitrionaExtra}
                      onPreciosAnfitrionaExtraChange={form.setPreciosAnfitrionaExtra}
                      onMlShotClienteChange={form.setMlShotCliente}
                      onMlShotAnfitrionaChange={form.setMlShotAnfitriona}
                      onTierChange={handleTierChange}
                    />
                  )}
                </section>
              </div>
            </div>

            <div className='shrink-0 border-t bg-background px-5 py-4 sm:px-6'>
              <div className='sm:ml-auto sm:max-w-md'>
                <TransferFooter
                  saving={saving}
                  disabled={
                    saving ||
                    form.disponible === 0 ||
                    (!form.usarConfigGuardada && form.tipos.length === 0)
                  }
                  onCancel={() => handleOpenChange(false)}
                />
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
