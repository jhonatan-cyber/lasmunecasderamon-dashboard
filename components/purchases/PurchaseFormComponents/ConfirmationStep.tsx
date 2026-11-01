import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { Line, toNumber, metodoPagoLabel } from './types';

export function ConfirmationStep({
  lines,
  total,
  proveedor,
  telefono,
  metodoPago,
  observaciones
}: {
  lines: Line[];
  total: number;
  proveedor: string;
  telefono: string;
  metodoPago: string;
  observaciones: string;
}) {
  return (
    <div className='mx-auto max-w-3xl space-y-4'>
      <h2 className='text-lg font-semibold'>Confirma la compra</h2>
      <div className='divide-y rounded-2xl border'>
        {lines.map(line => (
          <div key={line.presentacion_id} className='flex items-center justify-between gap-3 p-3'>
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
          <dd className='font-medium'>{proveedor || 'No indicado'}</dd>
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
  );
}
