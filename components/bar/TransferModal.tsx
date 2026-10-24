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
import { Minus, Plus } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { useTransferForm } from '@/hooks/transfers/useTransferForm';
import { useTransferSubmit } from '@/hooks/transfers/useTransferSubmit';
import { TransferItemSummary } from '@/components/bar/transfer/TransferItemSummary';
import { SavedConfigPanel } from '@/components/bar/transfer/SavedConfigPanel';
import { SaleTypeEditor } from '@/components/bar/transfer/SaleTypeEditor';
import { ColacionFields } from '@/components/bar/transfer/ColacionFields';
import { TransferFooter } from '@/components/bar/transfer/TransferFooter';
import {
  esBebidaAnalcoholica,
  esCigarrillos,
  formatNumber,
  type TransferModalProps
} from '@/components/bar/transfer/transferOptions';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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

  // Cigarrillos comparten el modo simple (sin anfitrionas ni cortos), pero sin
  // colación ni cover y con textos «de cigarrillo».
  const esAnalcoholica = esBebidaAnalcoholica(item?.categoria_nombre);
  const esCig = esCigarrillos(item?.categoria_nombre);
  const esVentaSimple = esAnalcoholica || esCig; // Solo las bebidas con anfitriona pueden incluir acompañamiento en la colación.
  const mostrarMlAcompanamiento = !esVentaSimple;
  // La colación se guarda en la opción botella: sin ella no hay dónde persistirla.
  const guardarBotella = form.usarConfigGuardada
    ? form.opcionesGuardadas.some(option => option.tipo === 'botella')
    : form.tipos.includes('botella');
  // Resumen del traspaso para el pie: unidades y valor por la vía botella.
  const unidades = Number(form.cantidad.replace(/\./g, '')) || 0;
  const precioBotella = form.usarConfigGuardada
    ? Number(form.opcionesGuardadas.find(option => option.tipo === 'botella')?.precio ?? 0)
    : Number(form.precioVenta.replace(/\./g, '')) || 0;
  // Inventarios resultantes si se confirma el traspaso.
  const stockBodegaFinal = Math.max(form.disponible - unidades, 0);
  const stockBarFinal = (item?.stock_bar ?? 0) + unidades;
  const ajustarCantidad = (delta: number) => {
    const maximo = Math.max(form.disponible, 1);
    form.setCantidad(formatNumber(String(Math.min(Math.max(unidades + delta, 1), maximo))));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='flex max-h-[92dvh] w-[calc(100vw_-_2rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-6xl'>
        <DialogHeader className='shrink-0 gap-1 border-b px-5 py-4 pr-12 sm:px-6'>
          <DialogTitle className='text-lg font-bold'>Transferir al bar</DialogTitle>
          {item && (
            <p className='truncate text-sm text-muted-foreground'>
              {item.categoria_nombre ? `${item.categoria_nombre} · ` : ''}
              {item.producto_nombre} de {item.nombre}
            </p>
          )}
          <DialogDescription className='sr-only'>
            Transfiere unidades de esta presentación desde bodega al bar.
          </DialogDescription>
        </DialogHeader>
        {!item ? null : (
          <form onSubmit={handleSubmit} className='flex min-h-0 flex-col'>
            <div className='min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6'>
              <div className='grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]'>
                <section className='min-w-0 space-y-5 lg:sticky lg:top-0 lg:z-10 lg:self-start lg:bg-background'>
                  <h2 className='text-sm font-semibold'>Unidades a transferir</h2>
                  <TransferItemSummary item={item} configuration={form} />

                  <div className='space-y-2'>
                    <Label
                      htmlFor='transfer-quantity'
                      className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
                    >
                      Unidades a transferir al bar
                    </Label>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        aria-label='Restar una unidad'
                        disabled={saving || unidades <= 1}
                        onClick={() => ajustarCantidad(-1)}
                        className='h-12 w-12 shrink-0 rounded-full p-0'
                      >
                        <Minus aria-hidden='true' className='h-4 w-4' />
                      </Button>
                      <Input
                        id='transfer-quantity'
                        required
                        value={form.cantidad}
                        onChange={e => {
                          // Sin pasarse del stock disponible en bodega (en vuelo).
                          const raw = formatNumber(e.target.value);
                          if (raw !== '' && Number(raw.replace(/\./g, '')) > form.disponible) {
                            form.setCantidad(
                              form.disponible > 0 ? formatNumber(String(form.disponible)) : ''
                            );
                            return;
                          }
                          form.setCantidad(raw);
                        }}
                        placeholder={`1 - ${form.disponible}`}
                        inputMode='numeric'
                        disabled={saving}
                        className='h-12 text-center text-lg font-semibold tabular-nums'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        aria-label='Sumar una unidad'
                        disabled={saving || unidades >= form.disponible}
                        onClick={() => ajustarCantidad(1)}
                        className='h-12 w-12 shrink-0 rounded-full p-0'
                      >
                        <Plus aria-hidden='true' className='h-4 w-4' />
                      </Button>
                    </div>
                    <div className='flex items-center justify-between gap-2 px-1'>
                      <p className='text-xs text-muted-foreground'>
                        {form.disponible > 0
                          ? `${form.disponible} disponibles en bodega`
                          : 'Sin stock en bodega'}
                      </p>
                      <Button
                        type='button'
                        variant='ghost'
                        size='sm'
                        disabled={saving || form.disponible === 0}
                        onClick={() => form.setCantidad(formatNumber(String(form.disponible)))}
                        className='h-7 rounded-full px-2 text-xs'
                      >
                        Usar todo
                      </Button>
                    </div>
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

                  {form.usarConfigGuardada ? (
                    <SavedConfigPanel
                      esCigarrillos={esCig}
                      mostrarBebidasIncluidas={!esVentaSimple}
                      mostrarAnfitrionas={!esVentaSimple}
                      mostrarCortos={!esVentaSimple}
                      maxAnfitrionas={form.maxAnfitrionas}
                      onMaxAnfitrionasChange={form.setMaxAnfitrionas}
                      bottleExtras={
                        <BottleExtras
                          commission={form.comision}

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
                      }
                      colacionHabilitada={form.colacionHabilitada}
                      bottleTiers={
                        Number(form.comision.replace(/\./g, '')) > 0 &&
                        Number(form.maxAnfitrionas || 1) >= 2 ? (
                          <ChampagneTiersEditor
                            tiers={form.tiers}
                            saving={saving}
                            onTierChange={handleTierChange}
                          />
                        ) : null
                      }
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
                      esCigarrillos={esCig}
                      mostrarBebidasIncluidas={!esVentaSimple}
                      mostrarAnfitrionas={!esVentaSimple}
                      mostrarCortos={!esVentaSimple}
                      mlAcompanamientoAnfitriona={form.mlAcompanamientoAnfitriona}
                      onMlAcompanamientoAnfitrionaChange={form.setMlAcompanamientoAnfitriona}

                      maxAnfitrionas={form.maxAnfitrionas}
                      onMaxAnfitrionasChange={form.setMaxAnfitrionas}
                      colacionHabilitada={form.colacionHabilitada}
                      acompanamientoBotella={form.acompanamientoBotella}
                      unidadesAcompanamiento={form.unidadesAcompanamiento}
                      onAcompanamientoBotellaChange={form.setAcompanamientoBotella}
                      onUnidadesAcompanamientoChange={form.setUnidadesAcompanamiento}
                      tipos={form.tipos}
                      etiquetaShot={form.etiquetaShot}
                      precioSinAnfitriona={form.precioSinAnfitriona}
                      onPrecioSinAnfitrionaChange={form.setPrecioSinAnfitriona}
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
                  <div className='mt-5 flex flex-wrap items-start gap-x-8 gap-y-3 border-t pt-4'>
                    {!esCig && guardarBotella && (
                      <Label className='flex cursor-pointer items-start gap-2'>
                        <Checkbox
                          checked={form.colacionHabilitada}
                          onCheckedChange={checked => form.setColacionHabilitada(checked === true)}
                          disabled={saving}
                          aria-label='Habilitar bebida para colación'
                        />
                        <span>
                          <span className='block text-sm font-medium'>Habilitar colación</span>
                          <span className='block text-xs text-muted-foreground'>
                            Aparecerá en el módulo Colaciones para cobrarla al trabajador.
                          </span>
                        </span>
                      </Label>
                    )}
                    {esAnalcoholica && (
                      <Label className='flex cursor-pointer items-start gap-2'>
                        <Checkbox
                          checked={form.coverHabilitado}
                          onCheckedChange={checked => form.setCoverHabilitado(checked === true)}
                          disabled={saving}
                          aria-label='Habilitar bebida para cover de clientes'
                        />
                        <span>
                          <span className='block text-sm font-medium'>
                            Habilitar cover para clientes
                          </span>
                          <span className='block text-xs text-muted-foreground'>
                            Aparecerá como opción al registrar entradas de clientes.
                          </span>
                        </span>
                      </Label>
                    )}
                  </div>
                  {form.colacionHabilitada && guardarBotella && (
                    <ColacionFields
                      idPrefix='transfer'
                      mlColacion={form.mlColacion}
                      onMlColacionChange={form.setMlColacion}
                      mlColacionSugerido={form.mlColacionSugerido}
                      mostrarAcompanamiento={mostrarMlAcompanamiento}
                      mlAcompanamiento={form.mlAcompanamientoColacion}
                      onMlAcompanamientoChange={form.setMlAcompanamientoColacion}
                      mlAcompanamientoSugerido={form.mlAcompanamientoColacionSugerido}
                      mlBotellaSugerida={item.ml_botella}
                      saving={saving}
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
                  summary={
                    <div className='flex items-end justify-between gap-4'>
                      <div className='text-xs text-muted-foreground'>
                        <p className='text-sm font-semibold text-foreground'>
                          {unidades > 0
                            ? `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`
                            : 'Sin unidades seleccionadas'}
                        </p>
                        {precioBotella > 0 && <p>{formatCurrencyCLP(precioBotella)} c/u</p>}
                        <p className='mt-1'>{`Quedarán ${stockBodegaFinal} en bodega · ${stockBarFinal} en el bar`}</p>
                      </div>
                      {precioBotella > 0 && unidades > 0 && (
                        <p className='text-xl font-bold tabular-nums' aria-live='polite'>
                          {formatCurrencyCLP(precioBotella * unidades)}
                        </p>
                      )}
                    </div>
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
