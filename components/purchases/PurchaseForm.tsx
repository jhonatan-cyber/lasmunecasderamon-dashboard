'use client';

import { useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Loader2, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { PurchaseCodesPanel } from './PurchaseCodesPanel';
import type { PurchaseRegistered } from '@/types/purchase';
import styles from './PurchaseForm.module.css';

export interface PurchaseCatalogItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  nombre: string;
  precio_compra: number;
  stock: number;
}

interface Line {
  presentacion_id: string;
  producto_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  cantidad: string;
  precio_compra: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: PurchaseCatalogItem[];
  onDone: () => void;
}

const formatMiles = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(v.replace(/\./g, '')) || 0;

export function PurchaseForm({ open, onOpenChange, catalog, onDone }: Props) {
  const formId = useId();
  const [comboOpen, setComboOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [proveedor, setProveedor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  // Compra registrada: el modal cambia a los códigos generados para imprimir.
  const [result, setResult] = useState<PurchaseRegistered | null>(null);

  const total = useMemo(
    () => lines.reduce((acc, l) => acc + toNumber(l.cantidad) * toNumber(l.precio_compra), 0),
    [lines]
  );

  const addItem = (item: PurchaseCatalogItem) => {
    if (lines.some(l => l.presentacion_id === item.id)) {
      toast.info('Esa presentación ya está en la compra');
      return;
    }
    setLines(prev => [
      ...prev,
      {
        presentacion_id: item.id,
        producto_id: item.producto_id,
        producto_nombre: item.producto_nombre,
        presentacion_nombre: item.nombre,
        cantidad: '1',
        precio_compra: formatMiles(String(item.precio_compra ?? 0))
      }
    ]);
    setComboOpen(false);
  };

  const adjustQuantity = (presentacionId: string, delta: number) => {
    setLines(prev =>
      prev.map(line =>
        line.presentacion_id === presentacionId
          ? {
              ...line,
              cantidad: formatMiles(
                String(Math.min(1000, Math.max(1, toNumber(line.cantidad) + delta)))
              )
            }
          : line
      )
    );
  };

  const reset = () => {
    setLines([]);
    setProveedor('');
    setTelefono('');
    setObservaciones('');
    setComboOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Agrega al menos una presentación');
      return;
    }
    const detalles = [];
    for (const l of lines) {
      const cantidad = toNumber(l.cantidad);
      const precio_compra = toNumber(l.precio_compra);
      if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 1000) {
        toast.error(`Cantidad inválida en ${l.producto_nombre} — ${l.presentacion_nombre}`);
        return;
      }
      if (!Number.isInteger(precio_compra) || precio_compra < 0) {
        toast.error(`Precio inválido en ${l.producto_nombre} — ${l.presentacion_nombre}`);
        return;
      }
      detalles.push({
        producto_id: l.producto_id,
        presentacion_id: l.presentacion_id,
        cantidad,
        precio_compra
      });
    }
    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detalles,
          proveedor: proveedor.trim() || null,
          telefono: telefono.trim() || null,
          observaciones: observaciones.trim() || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo registrar la compra');
        return;
      }
      toast.success(data.message || 'Compra registrada');
      reset();
      onDone();
      setResult(data.data as PurchaseRegistered);
    } catch {
      toast.error('Error de red al registrar');
    } finally {
      setSaving(false);
    }
  };

  // Al cerrar se descarta el resultado: reimprimir vive en el módulo Productos.
  const handleOpenChange = (next: boolean) => {
    if (!next) setResult(null);
    onOpenChange(next);
  };

  if (result) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className='max-h-[90dvh] overflow-y-auto max-w-2xl rounded-2xl'>
          <DialogHeader>
            <DialogTitle className='text-lg font-bold'>Compra registrada</DialogTitle>
            <DialogDescription>
              Códigos generados por unidad ingresada, agrupados por producto.
            </DialogDescription>
          </DialogHeader>
          <PurchaseCodesPanel
            folio={result.folio}
            codigos={result.codigos_generados ?? []}
            fechaCrea={result.fecha_crea}
            onClose={() => handleOpenChange(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto max-w-2xl rounded-2xl'>
        <DialogHeader>
          <DialogTitle className='text-lg font-bold'>Nueva compra</DialogTitle>
          <DialogDescription>
            Ingresa mercadería al almacén. Solo stock, no mueve caja.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4 py-2'>
          <div className='flex flex-col gap-2'>
            <Label htmlFor={`${formId}-producto`}>Producto / presentación</Label>
            {/* El modo modal permite desplazar el listado portaleado dentro del Dialog. */}
            <Popover modal open={comboOpen} onOpenChange={setComboOpen}>
              <PopoverTrigger asChild>
                <Button
                  type='button'
                  variant='outline'
                  id={`${formId}-producto`}
                  role='combobox'
                  aria-label='Agregar producto a la compra'
                  aria-expanded={comboOpen}
                  disabled={saving}
                  className='w-full justify-between rounded-full font-normal'
                >
                  <span className='truncate text-muted-foreground'>
                    {lines.length === 0
                      ? 'Seleccionar o buscar producto...'
                      : `${lines.length} en la compra — agregar otra...`}
                  </span>
                  <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className='w-[var(--radix-popover-trigger-width)] overflow-hidden p-0 rounded-2xl'
                align='start'
                sideOffset={8}
              >
                <Command>
                  <div className='flex flex-col gap-2 p-3'>
                    <Label htmlFor={`${formId}-buscar`}>Buscar producto</Label>
                    <div className={styles.searchField}>
                      <CommandInput
                        id={`${formId}-buscar`}
                        aria-label='Buscar producto o presentación'
                        placeholder='Buscar producto o presentación...'
                      />
                    </div>
                  </div>
                  <CommandList className='max-h-[min(16rem,40dvh,var(--radix-popover-content-available-height))] px-1 pb-1'>
                    <CommandEmpty>
                      {catalog.length === 0
                        ? 'No hay productos disponibles.'
                        : 'No se encontraron productos.'}
                    </CommandEmpty>
                    <CommandGroup heading='Productos disponibles'>
                      {catalog.map(c => {
                        const added = lines.some(l => l.presentacion_id === c.id);
                        return (
                          <CommandItem
                            key={c.id}
                            value={c.id}
                            keywords={[c.producto_nombre, c.nombre]}
                            disabled={added}
                            onSelect={() => addItem(c)}
                            className='flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3'
                          >
                            <span className='flex min-w-0 flex-1 flex-col gap-1'>
                              <span className='truncate font-medium'>{c.producto_nombre}</span>
                              <span className='text-xs text-muted-foreground'>
                                {c.nombre} · Stock: {c.stock}
                              </span>
                            </span>
                            <span className='flex shrink-0 flex-col items-end gap-1'>
                              <span className='text-sm font-medium tabular-nums'>
                                {formatCurrencyCLP(c.precio_compra)}
                              </span>
                              <span className='flex items-center gap-1 text-xs text-muted-foreground'>
                                {added && <Check aria-hidden='true' />}
                                {added ? 'Agregado' : 'Por unidad'}
                              </span>
                            </span>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {lines.length === 0 ? (
            <p className='text-center text-sm text-gray-400 py-6'>
              Sin ítems. Busca y agrega presentaciones.
            </p>
          ) : (
            <div className='space-y-2'>
              {lines.map(l => (
                <div
                  key={l.presentacion_id}
                  className='grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 rounded-2xl border border-gray-200 p-3 sm:grid-cols-[minmax(0,1fr)_10rem_7rem_auto]'
                >
                  <div className='col-span-2 min-w-0 sm:col-span-1'>
                    <p className='text-sm font-semibold truncate'>
                      {l.producto_nombre} — {l.presentacion_nombre}
                    </p>
                    <p className='text-xs text-gray-400'>
                      Subtotal:{' '}
                      {formatCurrencyCLP(toNumber(l.cantidad) * toNumber(l.precio_compra))}
                    </p>
                  </div>
                  <div className='col-span-2 flex flex-col gap-2 sm:col-span-1'>
                    <Label htmlFor={`${formId}-cantidad-${l.presentacion_id}`}>Cantidad</Label>
                    <div className='flex items-center gap-1'>
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='shrink-0 rounded-full'
                        aria-label={`Disminuir cantidad de ${l.producto_nombre}, ${l.presentacion_nombre}`}
                        disabled={saving || toNumber(l.cantidad) <= 1}
                        onClick={() => adjustQuantity(l.presentacion_id, -1)}
                      >
                        <Minus aria-hidden='true' />
                      </Button>
                      <Input
                        id={`${formId}-cantidad-${l.presentacion_id}`}
                        inputMode='numeric'
                        value={l.cantidad}
                        onChange={e =>
                          setLines(prev =>
                            prev.map(x =>
                              x.presentacion_id === l.presentacion_id
                                ? { ...x, cantidad: formatMiles(e.target.value) }
                                : x
                            )
                          )
                        }
                        disabled={saving}
                        className='h-10 min-w-0 flex-1 text-center'
                      />
                      <Button
                        type='button'
                        variant='outline'
                        size='icon'
                        className='shrink-0 rounded-full'
                        aria-label={`Aumentar cantidad de ${l.producto_nombre}, ${l.presentacion_nombre}`}
                        disabled={saving || toNumber(l.cantidad) >= 1000}
                        onClick={() => adjustQuantity(l.presentacion_id, 1)}
                      >
                        <Plus aria-hidden='true' />
                      </Button>
                    </div>
                  </div>
                  <div className='flex flex-col gap-2'>
                    <Label htmlFor={`${formId}-precio_compra-${l.presentacion_id}`}>
                      Precio unitario
                    </Label>
                    <Input
                      id={`${formId}-precio_compra-${l.presentacion_id}`}
                      inputMode='numeric'
                      value={l.precio_compra}
                      onChange={e =>
                        setLines(prev =>
                          prev.map(x =>
                            x.presentacion_id === l.presentacion_id
                              ? { ...x, precio_compra: formatMiles(e.target.value) }
                              : x
                          )
                        )
                      }
                      disabled={saving}
                      className='h-10 text-right'
                    />
                  </div>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    disabled={saving}
                    onClick={() =>
                      setLines(prev => prev.filter(x => x.presentacion_id !== l.presentacion_id))
                    }
                    className='rounded-full'
                    aria-label='Quitar'
                  >
                    <Trash2 className='w-4 h-4 text-red-500' />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`${formId}-proveedor`}>Proveedor (opcional)</Label>
              <Input
                id={`${formId}-proveedor`}
                value={proveedor}
                onChange={e =>
                  setProveedor(
                    e.target.value.replace(
                      /(^|\s)(\p{L})/gu,
                      (_, space, letter) => space + letter.toLocaleUpperCase('es')
                    )
                  )
                }
                autoCapitalize='words'
                placeholder='Proveedor (opcional)'
                maxLength={120}
                className='rounded-full'
                disabled={saving}
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label htmlFor={`${formId}-telefono`}>Teléfono (opcional)</Label>
              <Input
                id={`${formId}-telefono`}
                value={telefono}
                onChange={e => setTelefono(e.target.value)}
                placeholder='Teléfono (opcional)'
                maxLength={30}
                className='rounded-full'
                disabled={saving}
              />
            </div>
          </div>
          <div className='flex flex-col gap-2'>
            <Label htmlFor={`${formId}-observaciones`}>Observaciones (opcional)</Label>
            <Input
              id={`${formId}-observaciones`}
              value={observaciones}
              onChange={e =>
                setObservaciones(
                  e.target.value.replace(/\p{L}/u, letter => letter.toLocaleUpperCase('es'))
                )
              }
              autoCapitalize='off'
              placeholder='Observaciones (opcional: factura...)'
              className='rounded-full'
              disabled={saving}
            />
          </div>

          <div className='flex items-center justify-between pt-2'>
            <p className='text-sm text-gray-500'>
              Total:{' '}
              <span className='text-lg font-bold text-gray-900'>{formatCurrencyCLP(total)}</span>
            </p>
            <div className='flex gap-2'>
              <Button
                type='button'
                variant='outline'
                onClick={() => onOpenChange(false)}
                disabled={saving}
                className='rounded-full px-6'
              >
                Cancelar
              </Button>
              <Button
                type='submit'
                disabled={saving || lines.length === 0}
                className='rounded-full px-6 bg-black text-white hover:bg-white hover:text-black border-2'
              >
                {saving ? (
                  <span className='flex items-center gap-2'>
                    <Loader2 className='w-4 h-4 animate-spin' />
                    Guardando...
                  </span>
                ) : (
                  <span className='flex items-center gap-2'>
                    <Plus className='w-4 h-4' />
                    Registrar
                  </span>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
