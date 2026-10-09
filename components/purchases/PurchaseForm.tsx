'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  ShoppingBag,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { PurchaseCodesPanel } from './PurchaseCodesPanel';
import { PURCHASE_BUTTON_CLASS } from './buttonStyles';
import type { PurchaseRegistered } from '@/types/purchase';

export interface PurchaseCatalogItem {
  id: string;
  producto_id: string;
  producto_nombre: string;
  nombre: string;
  foto: string;
  precio_compra: number;
  stock: number;
}

interface Line {
  presentacion_id: string;
  producto_id: string;
  producto_nombre: string;
  presentacion_nombre: string;
  foto: string;
  cantidad: string;
  precio_compra: string;
}

interface Props {
  catalog: PurchaseCatalogItem[];
}

const formatMiles = (v: string) => v.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const toNumber = (v: string) => Number(v.replace(/\./g, '')) || 0;
const metodoPagoLabel = (method: string) =>
  ({ efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta' })[
    method as 'efectivo' | 'transferencia' | 'tarjeta'
  ] ?? method;

export function PurchaseForm({ catalog }: Props) {
  const router = useRouter();
  const formId = useId();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [search, setSearch] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [proveedor, setProveedor] = useState('');
  const [telefono, setTelefono] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [metodoPago, setMetodoPago] = useState<'efectivo' | 'tarjeta' | 'transferencia'>(
    'efectivo'
  );
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<PurchaseRegistered | null>(null);

  const total = useMemo(
    () => lines.reduce((acc, l) => acc + toNumber(l.cantidad) * toNumber(l.precio_compra), 0),
    [lines]
  );

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('es');
    if (!term) return catalog;
    return catalog.filter(item =>
      `${item.producto_nombre} ${item.nombre}`.toLocaleLowerCase('es').includes(term)
    );
  }, [catalog, search]);

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
        foto: item.foto,
        cantidad: '1',
        precio_compra: formatMiles(String(item.precio_compra ?? 0))
      }
    ]);
  };

  const removeItem = (presentacionId: string) =>
    setLines(prev => prev.filter(line => line.presentacion_id !== presentacionId));

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
    setMetodoPago('efectivo');
    setStep(1);
    setSearch('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Selecciona al menos un producto');
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
          observaciones: observaciones.trim() || null,
          metodo_pago: metodoPago
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        toast.error(data.message || 'No se pudo registrar la compra');
        return;
      }
      toast.success(data.message || 'Compra registrada');
      reset();
      setResult(data.data as PurchaseRegistered);
    } catch {
      toast.error('Error de red al registrar');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <section className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-10'>
        <header className='space-y-2'>
          <p className='text-sm font-medium text-emerald-700'>Compra completada</p>
          <h1 className='flex items-center gap-2 text-2xl font-bold text-gray-900 sm:text-3xl'>
            <ShoppingBag className='h-7 w-7' aria-hidden='true' />
            Compra registrada
          </h1>
          <p className='text-sm text-gray-600'>
            Los códigos se generaron por unidad y están agrupados para imprimir.
          </p>
        </header>
        <PurchaseCodesPanel
          folio={result.folio}
          codigos={result.codigos_generados ?? []}
          fechaCrea={result.fecha_crea}
          onClose={() => router.push('/purchases')}
        />
      </section>
    );
  }

  return (
    <section className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-10'>
      <header className='flex flex-wrap items-center justify-between gap-x-5 gap-y-2'>
        <div className='min-w-0'>
          <h1 className='text-2xl font-bold text-gray-900 sm:text-3xl'>Nueva compra</h1>
          <p className='mt-1 text-sm text-gray-600'>
            Ingresa mercadería al almacén. Solo stock, no mueve caja.
          </p>
        </div>
        <Button asChild variant='ghost' className={`${PURCHASE_BUTTON_CLASS} shrink-0`}>
          <Link href='/purchases'>
            <ArrowLeft className='mr-2 h-4 w-4' aria-hidden='true' />
            Volver a compras
          </Link>
        </Button>
      </header>
      <div className='space-y-6'>
        <ol aria-label='Pasos de la compra' className='grid grid-cols-3 gap-2'>
          {['Productos', 'Proveedor y pago', 'Confirmar'].map((label, index) => {
            const number = (index + 1) as 1 | 2 | 3;
            const active = step === number;
            const complete = step > number;
            return (
              <li
                key={label}
                aria-current={active ? 'step' : undefined}
                className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-xs font-semibold sm:text-sm ${active || complete ? 'border-primary text-foreground' : 'border-muted text-muted-foreground'}`}
              >
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${active || complete ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  {complete ? <Check className='h-4 w-4' /> : number}
                </span>
                {label}
              </li>
            );
          })}
        </ol>

        <form
          onSubmit={handleSubmit}
          className={`space-y-5 ${step === 1 && lines.length > 0 ? 'pb-24' : ''}`}
        >
          {step === 1 && (
            <div className='space-y-5'>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
                <div>
                  <h2 className='text-lg font-semibold'>Selecciona los productos</h2>
                  <p className='text-sm text-muted-foreground'>
                    Elige las presentaciones que ingresarán al almacén.
                  </p>
                </div>
                <Input
                  aria-label='Buscar productos'
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder='Buscar producto...'
                  className='sm:max-w-xs'
                />
              </div>
              {filteredCatalog.length === 0 ? (
                <p className='py-8 text-center text-sm text-muted-foreground'>
                  {catalog.length ? 'No hay coincidencias.' : 'No hay productos disponibles.'}
                </p>
              ) : (
                <div className='grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4'>
                  {filteredCatalog.map(item => {
                    const selected = lines.some(line => line.presentacion_id === item.id);
                    const image =
                      item.foto && item.foto !== 'default.png'
                        ? item.foto.startsWith('http')
                          ? item.foto
                          : `/api/images/products/${encodeURIComponent(item.foto)}`
                        : '/api/images/products/default.png';
                    return (
                      <Card
                        key={item.id}
                        className={`overflow-hidden transition-colors ${selected ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
                      >
                        <div className='aspect-square bg-muted'>
                          <Image
                            src={image}
                            alt={`${item.producto_nombre} ${item.nombre}`}
                            width={400}
                            height={400}
                            unoptimized
                            className='h-full w-full object-cover'
                            onError={event => {
                              event.currentTarget.src = '/api/images/products/default.png';
                            }}
                          />
                        </div>
                        <CardContent className='space-y-2 p-3'>
                          <div className='min-h-12'>
                            <p className='line-clamp-2 text-sm font-semibold'>
                              {item.producto_nombre}
                            </p>
                            <p className='truncate text-xs text-muted-foreground'>{item.nombre}</p>
                          </div>
                          <div className='flex items-center justify-between gap-1 text-xs'>
                            <span className='font-medium'>
                              {formatCurrencyCLP(item.precio_compra)}
                            </span>
                            <span className='text-muted-foreground'>Stock {item.stock}</span>
                          </div>
                          <Button
                            type='button'
                            size='sm'
                            variant={selected ? 'secondary' : 'default'}
                            className={`${PURCHASE_BUTTON_CLASS} w-full`}
                            onClick={() => (selected ? removeItem(item.id) : addItem(item))}
                            aria-pressed={selected}
                          >
                            {selected ? (
                              <CheckCircle2 className='mr-2 h-4 w-4' />
                            ) : (
                              <Plus className='mr-2 h-4 w-4' />
                            )}
                            {selected ? 'Seleccionado' : 'Agregar'}
                          </Button>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className='mx-auto max-w-4xl space-y-6'>
              <div className='space-y-3'>
                <div>
                  <h2 className='text-lg font-semibold'>Cantidades y precios</h2>
                  <p className='text-sm text-muted-foreground'>
                    Define cuántas unidades ingresan y su precio de compra.
                  </p>
                </div>
                {lines.map(line => (
                  <div
                    key={line.presentacion_id}
                    className='grid grid-cols-[3.5rem_minmax(0,1fr)] items-end gap-3 rounded-xl border p-3 sm:grid-cols-[4rem_minmax(0,1fr)_10rem_8rem_auto]'
                  >
                    <Image
                      src={
                        line.foto && line.foto !== 'default.png'
                          ? line.foto.startsWith('http')
                            ? line.foto
                            : `/api/images/products/${encodeURIComponent(line.foto)}`
                          : '/api/images/products/default.png'
                      }
                      alt={`${line.producto_nombre} ${line.presentacion_nombre}`}
                      width={64}
                      height={64}
                      unoptimized
                      className='h-14 w-14 rounded-lg object-cover'
                      onError={event => {
                        event.currentTarget.src = '/api/images/products/default.png';
                      }}
                    />
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>{line.producto_nombre}</p>
                      <p className='truncate text-xs text-muted-foreground'>
                        {line.presentacion_nombre}
                      </p>
                    </div>
                    <div className='col-span-2 flex flex-col gap-1 sm:col-span-1'>
                      <Label htmlFor={`${formId}-cantidad-${line.presentacion_id}`}>Cantidad</Label>
                      <div className='flex items-center gap-1'>
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          className={PURCHASE_BUTTON_CLASS}
                          aria-label={`Disminuir cantidad de ${line.producto_nombre}`}
                          disabled={toNumber(line.cantidad) <= 1}
                          onClick={() => adjustQuantity(line.presentacion_id, -1)}
                        >
                          <Minus />
                        </Button>
                        <Input
                          id={`${formId}-cantidad-${line.presentacion_id}`}
                          inputMode='numeric'
                          value={line.cantidad}
                          onChange={event =>
                            setLines(prev =>
                              prev.map(item =>
                                item.presentacion_id === line.presentacion_id
                                  ? { ...item, cantidad: formatMiles(event.target.value) }
                                  : item
                              )
                            )
                          }
                          className='text-center'
                        />
                        <Button
                          type='button'
                          variant='outline'
                          size='icon'
                          className={PURCHASE_BUTTON_CLASS}
                          aria-label={`Aumentar cantidad de ${line.producto_nombre}`}
                          disabled={toNumber(line.cantidad) >= 1000}
                          onClick={() => adjustQuantity(line.presentacion_id, 1)}
                        >
                          <Plus />
                        </Button>
                      </div>
                    </div>
                    <div className='flex flex-col gap-1'>
                      <Label htmlFor={`${formId}-precio-${line.presentacion_id}`}>
                        Precio unitario
                      </Label>
                      <Input
                        id={`${formId}-precio-${line.presentacion_id}`}
                        inputMode='numeric'
                        value={line.precio_compra}
                        onChange={event =>
                          setLines(prev =>
                            prev.map(item =>
                              item.presentacion_id === line.presentacion_id
                                ? { ...item, precio_compra: formatMiles(event.target.value) }
                                : item
                            )
                          )
                        }
                        className='text-right'
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      className={PURCHASE_BUTTON_CLASS}
                      aria-label={`Quitar ${line.producto_nombre}`}
                      onClick={() => removeItem(line.presentacion_id)}
                    >
                      <Trash2 className='h-4 w-4 text-red-500' />
                    </Button>
                  </div>
                ))}
                <p className='text-right text-sm text-muted-foreground'>
                  Subtotal productos:{' '}
                  <strong className='text-foreground'>{formatCurrencyCLP(total)}</strong>
                </p>
              </div>
              <div className='grid gap-4 sm:grid-cols-2'>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`${formId}-proveedor`}>Proveedor (opcional)</Label>
                  <Input
                    id={`${formId}-proveedor`}
                    value={proveedor}
                    onChange={event =>
                      setProveedor(
                        event.target.value.replace(
                          /(^|\s)(\p{L})/gu,
                          (_, space, letter) => space + letter.toLocaleUpperCase('es')
                        )
                      )
                    }
                    autoCapitalize='words'
                    placeholder='Nombre del proveedor'
                    maxLength={120}
                  />
                </div>
                <div className='flex flex-col gap-2'>
                  <Label htmlFor={`${formId}-telefono`}>Teléfono (opcional)</Label>
                  <Input
                    id={`${formId}-telefono`}
                    value={telefono}
                    onChange={event => setTelefono(event.target.value)}
                    placeholder='Teléfono del proveedor'
                    maxLength={30}
                  />
                </div>
                <div className='flex flex-col gap-2 sm:col-span-2'>
                  <Label htmlFor={`${formId}-observaciones`}>Descripción (opcional)</Label>
                  <Textarea
                    id={`${formId}-observaciones`}
                    value={observaciones}
                    onChange={event => setObservaciones(event.target.value)}
                    placeholder='Descripción, factura u otros detalles de la compra'
                    maxLength={500}
                    rows={4}
                  />
                </div>
                <div className='flex flex-col gap-2 sm:col-span-2'>
                  <Label htmlFor={`${formId}-metodo-pago`}>Método de pago</Label>
                  <Select
                    value={metodoPago}
                    onValueChange={(value: string) => setMetodoPago(value as typeof metodoPago)}
                  >
                    <SelectTrigger id={`${formId}-metodo-pago`}>
                      <SelectValue placeholder='Selecciona un método' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='efectivo'>Efectivo</SelectItem>
                      <SelectItem value='transferencia'>Transferencia</SelectItem>
                      <SelectItem value='tarjeta'>Tarjeta</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className='text-xs text-muted-foreground'>
                    Se registra como dato de la compra; no genera un movimiento de caja.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className='mx-auto max-w-3xl space-y-4'>
              <h2 className='text-lg font-semibold'>Confirma la compra</h2>
              <div className='divide-y rounded-2xl border'>
                {lines.map(line => (
                  <div
                    key={line.presentacion_id}
                    className='flex items-center justify-between gap-3 p-3'
                  >
                    <div className='min-w-0'>
                      <p className='truncate text-sm font-semibold'>
                        {line.producto_nombre} · {line.presentacion_nombre}
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {line.cantidad} × {formatCurrencyCLP(toNumber(line.precio_compra))}
                      </p>
                    </div>
                    <span className='shrink-0 text-sm font-semibold'>
                      {formatCurrencyCLP(toNumber(line.cantidad) * toNumber(line.precio_compra))}
                    </span>
                  </div>
                ))}
              </div>
              <dl className='grid gap-3 rounded-2xl bg-muted/50 p-4 text-sm sm:grid-cols-2'>
                <div>
                  <dt className='text-muted-foreground'>Proveedor</dt>
                  <dd className='font-medium'>{proveedor}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Teléfono</dt>
                  <dd className='font-medium'>{telefono || 'No indicado'}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Método de pago</dt>
                  <dd className='font-medium'>{metodoPagoLabel(metodoPago)}</dd>
                </div>
                <div>
                  <dt className='text-muted-foreground'>Descripción</dt>
                  <dd className='font-medium'>{observaciones || 'Sin descripción'}</dd>
                </div>
              </dl>
              <div className='flex justify-between border-t pt-4 text-lg font-bold'>
                <span>Total</span>
                <span>{formatCurrencyCLP(total)}</span>
              </div>
            </div>
          )}

          {step !== 1 && (
            <div className='flex flex-wrap items-center justify-between gap-3 border-t pt-4'>
              <p className='text-sm text-muted-foreground'>
                {lines.length} presentaciones · Total {formatCurrencyCLP(total)}
              </p>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  className={PURCHASE_BUTTON_CLASS}
                  onClick={() => setStep(step === 3 ? 2 : 1)}
                  disabled={saving}
                >
                  Atrás
                </Button>
                {step === 2 && (
                  <Button
                    type='button'
                    onClick={() => setStep(3)}
                    disabled={saving}
                    className={PURCHASE_BUTTON_CLASS}
                  >
                    Revisar compra
                  </Button>
                )}
                {step === 3 && (
                  <Button
                    type='submit'
                    disabled={saving || lines.length === 0}
                    className={PURCHASE_BUTTON_CLASS}
                  >
                    {saving ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Registrando...
                      </>
                    ) : (
                      <>
                        <ShoppingBag className='mr-2 h-4 w-4' />
                        Finalizar compra
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </form>
        {step === 1 && lines.length > 0 && (
          <div className='fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6'>
            <div className='flex items-center gap-3 rounded-2xl border bg-background/95 p-3 shadow-xl backdrop-blur sm:gap-5 sm:px-4'>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>
                  {lines.length} {lines.length === 1 ? 'presentación' : 'presentaciones'}{' '}
                  seleccionadas
                </p>
                <p className='text-xs text-muted-foreground'>Total {formatCurrencyCLP(total)}</p>
              </div>
              <Button
                type='button'
                onClick={() => setStep(2)}
                className={`${PURCHASE_BUTTON_CLASS} shrink-0`}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
