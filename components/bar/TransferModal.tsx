'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
      <DialogContent className='max-h-[90dvh] max-w-lg overflow-y-auto rounded-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>Traspasar al bar</DialogTitle>
          <DialogDescription>
            Transfiere unidades de esta presentación desde almacén al bar.
          </DialogDescription>
        </DialogHeader>
        {!item ? null : (
          <form onSubmit={handleSubmit} className='space-y-5 py-2'>
            <TransferItemSummary item={item} />

            <div className='space-y-2'>
              <label
                htmlFor='transfer-quantity'
                className='block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 ml-1'
              >
                Cantidad
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
            </div>

            {form.usarConfigGuardada ? (
              <SavedConfigPanel
                opciones={form.opcionesGuardadas}
                esChampagne={form.esChampagneItem}
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
                tipos={form.tipos}
                etiquetaShot={form.etiquetaShot}
                precioVenta={form.precioVenta}
                comision={form.comision}
                precioShot={form.precioShot}
                comisionShot={form.comisionShot}
                shotMl={form.shotMl}
                mlShotCliente={form.mlShotCliente}
                mlShotAnfitriona={form.mlShotAnfitriona}
                esChampagne={form.esChampagneItem}
                tiers={form.tiers}
                saving={saving}
                onTiposChange={form.setTipos}
                onPrecioVentaChange={form.setPrecioVenta}
                onComisionChange={form.setComision}
                onPrecioShotChange={form.setPrecioShot}
                onComisionShotChange={form.setComisionShot}
                onMlShotClienteChange={form.setMlShotCliente}
                onMlShotAnfitrionaChange={form.setMlShotAnfitriona}
                onTierChange={handleTierChange}
                onUseSavedConfig={form.tieneConfig ? () => form.setEditarPrecios(false) : undefined}
              />
            )}

            <TransferFooter
              saving={saving}
              disabled={
                saving ||
                form.disponible === 0 ||
                (!form.usarConfigGuardada && form.tipos.length === 0)
              }
              onCancel={() => handleOpenChange(false)}
            />
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
