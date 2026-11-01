import Image from 'next/image';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/shared/DatePicker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Line, formatMiles, toNumber } from './types';

export function DetailsStep({
  lines,
  setLines,
  total,
  proveedor,
  setProveedor,
  telefono,
  setTelefono,
  observaciones,
  setObservaciones,
  metodoPago,
  setMetodoPago,
  formId,
  adjustQuantity,
  removeItem,
  changeLineFechas
}: {
  lines: Line[];
  setLines: React.Dispatch<React.SetStateAction<Line[]>>;
  total: number;
  proveedor: string;
  setProveedor: (v: string) => void;
  telefono: string;
  setTelefono: (v: string) => void;
  observaciones: string;
  setObservaciones: (v: string) => void;
  metodoPago: 'efectivo' | 'tarjeta' | 'transferencia';
  setMetodoPago: (v: 'efectivo' | 'tarjeta' | 'transferencia') => void;
  formId: string;
  adjustQuantity: (id: string, d: number) => void;
  removeItem: (id: string) => void;
  changeLineFechas: (id: string, c: any, v: string) => void;
}) {
  return (
    <div className='mx-auto max-w-4xl space-y-6'>
      <div className='space-y-3'>
        <div>
          <h2 className='text-lg font-semibold'>Cantidades y precios</h2>
          <p className='text-sm text-muted-foreground'>
            Define cuántas unidades ingresan y su precio de compra.
          </p>
          <p className='mt-1 text-xs text-muted-foreground'>
            Fechas de lote (opcional): con la elaboración y la duración el vencimiento se calcula
            solo; si ingresas el vencimiento, elaboración y duración no son necesarias.
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
              onError={e => {
                e.currentTarget.src = '/api/images/products/default.png';
              }}
            />
            <div className='min-w-0'>
              <p className='truncate text-sm font-semibold'>{line.producto_nombre}</p>
              <p className='truncate text-xs text-muted-foreground'>{line.presentacion_nombre}</p>
            </div>
            <div className='col-span-2 flex flex-col gap-1 sm:col-span-1'>
              <Label htmlFor={`${formId}-cantidad-${line.presentacion_id}`}>Cantidad</Label>
              <div className='flex items-center gap-1'>
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='rounded-full'
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
                  onChange={e =>
                    setLines(prev =>
                      prev.map(item =>
                        item.presentacion_id === line.presentacion_id
                          ? { ...item, cantidad: formatMiles(e.target.value) }
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
                  className='rounded-full'
                  aria-label={`Aumentar cantidad de ${line.producto_nombre}`}
                  disabled={toNumber(line.cantidad) >= 1000}
                  onClick={() => adjustQuantity(line.presentacion_id, 1)}
                >
                  <Plus />
                </Button>
              </div>
            </div>
            <div className='flex flex-col gap-1'>
              <Label htmlFor={`${formId}-precio-${line.presentacion_id}`}>Precio unitario</Label>
              <Input
                id={`${formId}-precio-${line.presentacion_id}`}
                inputMode='numeric'
                value={line.precio_compra}
                onChange={e =>
                  setLines(prev =>
                    prev.map(item =>
                      item.presentacion_id === line.presentacion_id
                        ? { ...item, precio_compra: formatMiles(e.target.value) }
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
              className='rounded-full'
              aria-label={`Quitar ${line.producto_nombre}`}
              onClick={() => removeItem(line.presentacion_id)}
            >
              <Trash2 className='h-4 w-4 text-red-500' />
            </Button>
            <div className='col-span-full grid grid-cols-1 gap-3 border-t pt-3 sm:grid-cols-3'>
              <div className='flex flex-col gap-1'>
                <Label htmlFor={`${formId}-elaboracion-${line.presentacion_id}`}>
                  Fecha de elaboración
                </Label>
                <DatePicker
                  id={`${formId}-elaboracion-${line.presentacion_id}`}
                  value={line.fecha_elaboracion}
                  onChange={f => changeLineFechas(line.presentacion_id, 'fecha_elaboracion', f)}
                  displayFormat='short'
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label htmlFor={`${formId}-duracion-${line.presentacion_id}`}>
                  Duración (meses)
                </Label>
                <Input
                  id={`${formId}-duracion-${line.presentacion_id}`}
                  inputMode='numeric'
                  placeholder='Ej: 6'
                  value={line.duracion_meses}
                  onChange={e =>
                    changeLineFechas(line.presentacion_id, 'duracion_meses', e.target.value)
                  }
                />
              </div>
              <div className='flex flex-col gap-1'>
                <Label htmlFor={`${formId}-vencimiento-${line.presentacion_id}`}>
                  Fecha de vencimiento
                </Label>
                <DatePicker
                  id={`${formId}-vencimiento-${line.presentacion_id}`}
                  value={line.fecha_vencimiento}
                  onChange={f => changeLineFechas(line.presentacion_id, 'fecha_vencimiento', f)}
                  displayFormat='short'
                />
              </div>
            </div>
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
            onChange={e =>
              setProveedor(
                e.target.value.replace(
                  /(^|\s)(\p{L})/gu,
                  (_, s, l) => s + l.toLocaleUpperCase('es')
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
            onChange={e => setTelefono(e.target.value)}
            placeholder='Teléfono del proveedor'
            maxLength={30}
          />
        </div>
        <div className='flex flex-col gap-2 sm:col-span-2'>
          <Label htmlFor={`${formId}-observaciones`}>Descripción (opcional)</Label>
          <Textarea
            id={`${formId}-observaciones`}
            value={observaciones}
            onChange={e => setObservaciones(e.target.value)}
            placeholder='Descripción, factura u otros detalles de la compra'
            maxLength={500}
            rows={4}
          />
        </div>
        <div className='flex flex-col gap-2 sm:col-span-2'>
          <Label htmlFor={`${formId}-metodo-pago`}>Método de pago</Label>
          <Select
            value={metodoPago}
            onValueChange={(v: 'efectivo' | 'tarjeta' | 'transferencia') => setMetodoPago(v)}
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
  );
}
