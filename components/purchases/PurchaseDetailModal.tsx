'use client';

import { useEffect, useMemo, useState } from 'react';
import { FileText, Printer, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import type { PurchaseGeneratedCode, PurchaseRecord } from '@/types/purchase';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { printUnitLabels } from '@/lib/utils/printUnitLabels';
import { groupLabelUnits } from '@/lib/utils/unitLabelGroups';
import { buildExportFilename } from '@/lib/utils/calendarUtils';
import { productImageUrl } from '@/lib/utils/productImage';
import { ProductPhoto } from '@/components/shared/ProductPhoto';
import logger from '@/lib/utils/logger';

const METODO_PAGO_LABELS: Record<PurchaseRecord['metodo_pago'], string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia'
};

const formatFecha = (fecha: string | null | undefined) =>
  fecha ? String(fecha).replace('T', ' ').slice(0, 16) : '—';

const contarItems = (purchase: PurchaseRecord) =>
  purchase.detalles.reduce((acc, d) => acc + Number(d.cantidad || 0), 0);

const PRINT_STYLES = `@media print { body * { visibility: hidden; } #purchase-detail-print, #purchase-detail-print * { visibility: visible; } #purchase-detail-print { position: absolute; left: 0; top: 0; width: 100%; padding: 0; background: white; color: black; } #purchase-detail-print * { color: black !important; background: transparent !important; } #purchase-detail-print table { width: 100%; border-collapse: collapse; } #purchase-detail-print th, #purchase-detail-print td { border-bottom: 1px solid #aaa; padding: 6px; font-size: 11px; text-align: left; } #purchase-detail-print tr { break-inside: avoid; } @page { size: A4; margin: 12mm; } }`;

interface PurchaseDetailModalProps {
  purchase: PurchaseRecord | null;
  onClose: () => void;
}

export function PurchaseDetailModal({ purchase, onClose }: PurchaseDetailModalProps) {
  const [exporting, setExporting] = useState(false);
  const [codigos, setCodigos] = useState<PurchaseGeneratedCode[] | null>(null);
  const [codigosError, setCodigosError] = useState(false);

  useEffect(() => {
    setCodigos(null);
    setCodigosError(false);
    if (!purchase) return;
    let cancelled = false;
    fetch(`/api/purchases/${encodeURIComponent(purchase.id)}/codes`, { cache: 'no-store' })
      .then(async response => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload.success) throw new Error('codes-unavailable');
        return Array.isArray(payload.data) ? (payload.data as PurchaseGeneratedCode[]) : [];
      })
      .then(data => {
        if (!cancelled) setCodigos(data);
      })
      .catch(() => {
        if (!cancelled) setCodigosError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [purchase]);

  const gruposCodigos = useMemo(
    () =>
      groupLabelUnits(
        (codigos ?? []).map(codigo => ({
          id: codigo.id,
          codigo: codigo.codigo,
          codigo_barras: codigo.codigo_barras,
          producto_nombre: codigo.producto_nombre,
          presentacion_nombre: codigo.presentacion_nombre
        })),
        'presentation'
      ),
    [codigos]
  );

  const imprimirCodigos = () => {
    if (!codigos?.length) return;
    try {
      printUnitLabels(
        codigos.map(codigo => ({
          code: codigo.codigo_barras || codigo.codigo,
          producto_nombre: codigo.producto_nombre,
          presentacion_nombre: codigo.presentacion_nombre
        }))
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudieron imprimir los códigos.');
    }
  };

  const exportPdf = async () => {
    if (!purchase || exporting) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();

      doc.setFontSize(16);
      doc.setTextColor(20, 20, 20);
      doc.text(`Compra ${purchase.folio}`, 14, 20);

      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      const meta = [
        `Fecha: ${formatFecha(purchase.fecha_crea)}`,
        `Proveedor: ${purchase.proveedor || '—'}${
          purchase.telefono ? ` · ${purchase.telefono}` : ''
        }`,
        `Registró: ${purchase.usuario_nombre || '—'}`,
        `Método de pago: ${METODO_PAGO_LABELS[purchase.metodo_pago] ?? purchase.metodo_pago}`
      ];
      doc.text(meta, 14, 28);

      let startY = 28 + meta.length * 5 + 4;
      if (purchase.observaciones) {
        const observaciones = doc.splitTextToSize(`Observaciones: ${purchase.observaciones}`, 180);
        doc.text(observaciones, 14, startY);
        startY += observaciones.length * 5 + 4;
      }

      autoTable(doc, {
        startY,
        head: [['Producto', 'Presentación', 'Cantidad', 'Precio c/u', 'Subtotal']],
        body: [
          ...purchase.detalles.map(d => [
            d.producto_nombre,
            d.presentacion_nombre,
            String(d.cantidad),
            formatCurrencyCLP(d.precio_compra),
            formatCurrencyCLP(d.subtotal)
          ]),
          ['', '', '', 'Total', formatCurrencyCLP(Number(purchase.total || 0))]
        ],
        styles: { fontSize: 9, cellPadding: 2, overflow: 'linebreak' },
        headStyles: { fillColor: [22, 22, 22], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        columnStyles: { 2: { halign: 'center' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
        margin: { left: 14, right: 14 }
      });

      doc.save(buildExportFilename(`compra-${purchase.folio}`, 'pdf'));
      toast.success('PDF exportado correctamente');
    } catch (error) {
      logger.captureException(error, { context: 'PurchaseDetailModal:exportPdf' });
      toast.error('Error al exportar PDF');
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <style>{PRINT_STYLES}</style>
      <Dialog open={Boolean(purchase)} onOpenChange={open => !open && onClose()}>
        <DialogContent className='flex max-h-[90vh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl sm:p-0'>
          {purchase && (
            <>
              <DialogHeader className='border-b border-gray-200 px-4 py-4 pr-12 text-left sm:px-6 dark:border-gray-800'>
                <DialogTitle className='flex items-center gap-2'>
                  <ShoppingBag className='h-5 w-5' />
                  Detalle de compra · {purchase.folio}
                </DialogTitle>
                <DialogDescription>
                  {formatFecha(purchase.fecha_crea)}
                  {purchase.proveedor ? ` · ${purchase.proveedor}` : ''}
                </DialogDescription>
              </DialogHeader>

              <div className='min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6'>
                <div className='grid grid-cols-2 gap-4 text-sm sm:grid-cols-3'>
                  <div>
                    <p className='text-xs text-muted-foreground'>Registró</p>
                    <p className='font-medium'>{purchase.usuario_nombre || '—'}</p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Proveedor</p>
                    <p className='font-medium'>{purchase.proveedor || '—'}</p>
                    {purchase.telefono && (
                      <p className='text-xs text-muted-foreground'>{purchase.telefono}</p>
                    )}
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Método de pago</p>
                    <p className='font-medium'>
                      {METODO_PAGO_LABELS[purchase.metodo_pago] ?? purchase.metodo_pago}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Ítems</p>
                    <Badge className='mt-1 rounded-full bg-blue-100 px-3 py-1 text-blue-700'>
                      {contarItems(purchase)} un.
                    </Badge>
                  </div>
                  <div>
                    <p className='text-xs text-muted-foreground'>Total</p>
                    <p className='font-mono text-base font-bold'>
                      {formatCurrencyCLP(Number(purchase.total || 0))}
                    </p>
                  </div>
                </div>

                <div className='grid gap-2 sm:grid-cols-2'>
                  {purchase.detalles.map(d => (
                    <div
                      key={d.id}
                      className='flex items-start gap-3 rounded-xl border border-gray-200 p-3 dark:border-gray-800'
                    >
                      <div className='relative size-12 shrink-0 overflow-hidden rounded-lg bg-white dark:bg-white/5'>
                        <ProductPhoto
                          src={productImageUrl(d.presentacion_foto, d.producto_foto)}
                          alt={d.producto_nombre}
                          fill
                          className='object-contain p-1'
                        />
                      </div>
                      <div className='min-w-0 flex-1'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <p className='truncate text-sm font-medium'>{d.producto_nombre}</p>
                            <p className='truncate text-xs text-muted-foreground'>
                              {d.presentacion_nombre}
                            </p>
                          </div>
                          <p className='shrink-0 font-mono text-sm font-semibold'>
                            {formatCurrencyCLP(d.subtotal)}
                          </p>
                        </div>
                        <p className='mt-2 text-xs text-muted-foreground'>
                          {d.cantidad} un. × {formatCurrencyCLP(d.precio_compra)} c/u
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className='flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-sm'>
                  <span className='font-bold'>Total</span>
                  <span className='font-mono font-bold'>
                    {formatCurrencyCLP(Number(purchase.total || 0))}
                  </span>
                </div>

                {purchase.observaciones && (
                  <p className='text-sm text-muted-foreground'>
                    Observaciones: {purchase.observaciones}
                  </p>
                )}

                <div className='space-y-2'>
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <h3 className='text-sm font-semibold'>Códigos de la compra</h3>
                    {codigos && codigos.length > 0 && (
                      <div className='flex flex-wrap items-center gap-2'>
                        <Badge className='rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
                          {codigos.length} códigos
                        </Badge>
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='rounded-full'
                          onClick={imprimirCodigos}
                        >
                          <Printer className='h-4 w-4' />
                          Imprimir códigos
                        </Button>
                      </div>
                    )}
                  </div>
                  {codigos === null && !codigosError ? (
                    <p className='text-sm text-muted-foreground'>Cargando códigos...</p>
                  ) : codigosError ? (
                    <p className='text-sm text-muted-foreground'>
                      No se pudieron cargar los códigos.
                    </p>
                  ) : codigos && codigos.length === 0 ? (
                    <p className='text-sm text-muted-foreground'>
                      Esta compra no tiene códigos generados.
                    </p>
                  ) : (
                    <div className='space-y-2'>
                      {gruposCodigos.map(grupo => (
                        <div
                          key={grupo.title}
                          className='rounded-xl border border-gray-200 p-3 dark:border-gray-800'
                        >
                          <p className='text-xs font-semibold'>{grupo.title}</p>
                          <div className='mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3'>
                            {grupo.units.map(unidad => (
                              <code
                                key={unidad.id}
                                className='rounded-md border bg-muted/40 px-2 py-1 text-[11px] font-semibold break-all'
                              >
                                {unidad.codigo_barras || unidad.codigo}
                              </code>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className='gap-2 border-t border-gray-200 px-4 py-4 sm:space-x-0 sm:px-6 dark:border-gray-800'>
                <Button variant='outline' className='rounded-full' onClick={() => window.print()}>
                  <Printer className='h-4 w-4' />
                  Imprimir
                </Button>
                <Button
                  variant='outline'
                  className='rounded-full'
                  onClick={() => void exportPdf()}
                  disabled={exporting}
                >
                  <FileText className='h-4 w-4 text-red-500' />
                  {exporting ? 'Exportando...' : 'Exportar PDF'}
                </Button>
                <Button variant='outline' className='rounded-full' onClick={onClose}>
                  Cerrar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {purchase && (
        <section id='purchase-detail-print' className='hidden print:block'>
          <h1 className='text-xl font-bold'>Compra {purchase.folio}</h1>
          <p className='text-sm'>Fecha: {formatFecha(purchase.fecha_crea)}</p>
          <p className='text-sm'>Proveedor: {purchase.proveedor || '—'}</p>
          {purchase.telefono && <p className='text-sm'>Teléfono: {purchase.telefono}</p>}
          <p className='text-sm'>Registró: {purchase.usuario_nombre || '—'}</p>
          <p className='text-sm'>
            Método de pago: {METODO_PAGO_LABELS[purchase.metodo_pago] ?? purchase.metodo_pago}
          </p>
          <Table className='mt-4'>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead>Presentación</TableHead>
                <TableHead>Cantidad</TableHead>
                <TableHead>Precio c/u</TableHead>
                <TableHead>Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.detalles.map(d => (
                <TableRow key={d.id}>
                  <TableCell>{d.producto_nombre}</TableCell>
                  <TableCell>{d.presentacion_nombre}</TableCell>
                  <TableCell>{d.cantidad}</TableCell>
                  <TableCell>{formatCurrencyCLP(d.precio_compra)}</TableCell>
                  <TableCell>{formatCurrencyCLP(d.subtotal)}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={4}>
                  <strong>Total</strong>
                </TableCell>
                <TableCell>
                  <strong>{formatCurrencyCLP(Number(purchase.total || 0))}</strong>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          {purchase.observaciones && <p className='mt-4 text-sm'>Obs: {purchase.observaciones}</p>}
        </section>
      )}
    </>
  );
}
