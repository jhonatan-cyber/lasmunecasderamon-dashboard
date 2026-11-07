'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Eye,
  Ban,
  Package,
  MapPin,
  Banknote,
  CreditCard,
  Landmark,
  Ticket,
  Printer,
  type LucideIcon
} from 'lucide-react';
import { VentaWithDetails } from '@/types/venta';

interface SalesListItemProps {
  venta: VentaWithDetails;
  index: number;
  statusLabels: Record<number, string>;
  metodoPagoLabels: Record<string, string>;
  anfitrionaColors: string[];
  formatCurrency: (value: number) => string;
  canViewDetails: boolean;
  canAnular: boolean;
  hasAnyAction: boolean;
  onVerDetalles: (ventaId: string | number) => void;
  onImprimir: (venta: VentaWithDetails) => void;
  onAnularClick: (venta: VentaWithDetails) => void;
}

const statusTheme: Record<number, { badge: string; dot: string; rail: string }> = {
  1: {
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    rail: 'border-l-emerald-500'
  },
  2: {
    badge: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
    dot: 'bg-sky-500',
    rail: 'border-l-sky-500'
  },
  3: {
    badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
    dot: 'bg-amber-500',
    rail: 'border-l-amber-500'
  },
  0: {
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
    dot: 'bg-rose-500',
    rail: 'border-l-rose-500'
  }
};

const metodoPagoIcons: Record<string, LucideIcon> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  transferencia: Landmark,
  prepago: Ticket
};

function getSaleOrigin(venta: VentaWithDetails) {
  const origin =
    venta.origen ||
    (venta.entrada_id
      ? 'entrada'
      : venta.servicio_id
        ? 'servicio'
        : venta.habitacion_id
          ? 'habitacion'
          : venta.pedido_id
            ? 'pedido'
            : 'barra');
  const labels = {
    entrada: 'Entrada',
    servicio: 'Servicio',
    habitacion: 'Habitación',
    pedido: 'Pedido',
    barra: 'Barra'
  } as const;
  return labels[origin];
}

export function SalesListItem({
  venta,
  statusLabels,
  metodoPagoLabels,
  anfitrionaColors,
  formatCurrency,
  canViewDetails,
  canAnular,
  hasAnyAction,
  onVerDetalles,
  onImprimir,
  onAnularClick
}: SalesListItemProps) {
  const estadoNum =
    venta?.estado !== null && venta?.estado !== undefined ? Number(venta.estado) : 1;
  const theme = statusTheme[estadoNum] || statusTheme[1];
  const itemCount =
    (venta as any).item_count ?? (Array.isArray(venta.detalles) ? venta.detalles.length : 0);
  const propina = Number((venta as any).propina || 0);

  const anfitrionasNicks: string[] = (venta as any).anfitrionas_nicks
    ? String((venta as any).anfitrionas_nicks)
        .split(',')
        .filter(Boolean)
    : Array.isArray(venta.usuarios)
      ? venta.usuarios.map((u: any) => u.nick || u.usuario_nombre).filter(Boolean)
      : [];

  const fechaStr = venta?.fecha_crea
    ? new Date(venta.fecha_crea).toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      })
    : '';
  const horaStr = venta?.fecha_crea
    ? new Date(venta.fecha_crea).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : '';

  const ubicacion = venta.habitacion_nombre || (venta as any).habitacion_numero;
  const PagoIcon = metodoPagoIcons[venta?.metodo_pago] || Banknote;
  const originLabel = getSaleOrigin(venta);
  const canRequestAnulacion =
    canAnular &&
    Number(venta?.estado) !== 0 &&
    Number(venta?.estado) !== 3 &&
    !Boolean((venta as any)?.has_anulacion_solicitada);

  return (
    <article
      className={`overflow-hidden rounded-xl border border-neutral-200 border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 ${theme.rail}`}
    >
      <div className='p-4 sm:p-5'>
        <div className='flex items-start justify-between gap-3'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1'>
              <span className='text-xs font-semibold tracking-wide text-neutral-500 dark:text-neutral-400'>
                {venta?.codigo || 'Venta'}
              </span>
              <span className='text-neutral-300 dark:text-neutral-700' aria-hidden='true'>
                ·
              </span>
              <span className='text-xs text-neutral-500 dark:text-neutral-400'>
                Origen: {originLabel}
              </span>
            </div>
            {fechaStr && (
              <p className='mt-1 text-xs text-neutral-500 dark:text-neutral-400'>
                {fechaStr}
                {horaStr ? ` · ${horaStr}` : ''}
              </p>
            )}
          </div>
          <span
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${theme.badge}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${theme.dot}`} />
            {statusLabels[estadoNum] || 'Desconocido'}
          </span>
        </div>

        <div className='mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2'>
          <div>
            <p className='text-[11px] font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400'>
              Total
            </p>
            <p className='mt-0.5 text-2xl font-semibold tabular-nums tracking-tight text-neutral-900 dark:text-neutral-100'>
              ${formatCurrency(venta?.total || 0)}
            </p>
          </div>
          <div className='min-w-0 text-right'>
            <p className='max-w-full truncate text-sm font-medium text-neutral-800 dark:text-neutral-200'>
              {venta.cliente_nombre || 'Sin cliente'}
            </p>
            {ubicacion && (
              <p className='mt-0.5 inline-flex max-w-full items-center gap-1 truncate text-xs text-neutral-500 dark:text-neutral-400'>
                <MapPin className='h-3 w-3 shrink-0' />
                {ubicacion}
              </p>
            )}
          </div>
        </div>

        <div className='mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-100 pt-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400'>
          <span className='inline-flex items-center gap-1.5'>
            <Package className='h-3.5 w-3.5' />
            {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
          </span>
          <span className='inline-flex items-center gap-1.5'>
            <PagoIcon className='h-3.5 w-3.5' />
            {metodoPagoLabels[venta?.metodo_pago as keyof typeof metodoPagoLabels] || 'Efectivo'}
          </span>
          {propina > 0 && (
            <span className='font-medium text-neutral-700 dark:text-neutral-300'>
              Propina {formatCurrency(propina)}
            </span>
          )}
        </div>

        {anfitrionasNicks.length > 0 && (
          <div className='mt-3 flex flex-wrap gap-1.5'>
            {anfitrionasNicks.map((nick: string, uIdx: number) => (
              <Badge
                key={`${nick}-${uIdx}`}
                className={`${anfitrionaColors[uIdx % anfitrionaColors.length]} h-6 rounded-md px-2 text-[11px] font-medium`}
              >
                {nick}
              </Badge>
            ))}
          </div>
        )}

        {hasAnyAction && (
          <TooltipProvider delayDuration={150}>
            <div className='mt-4 flex items-center gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800'>
              {canViewDetails && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      aria-label='Imprimir ticket de venta'
                      className='h-8 w-8 rounded-md'
                      onClick={() => onImprimir(venta)}
                    >
                      <Printer className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Imprimir ticket</TooltipContent>
                </Tooltip>
              )}
              {canViewDetails && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      aria-label='Ver detalles'
                      className='h-8 w-8 rounded-md'
                      onClick={() => onVerDetalles(venta.id)}
                    >
                      <Eye className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Ver detalles</TooltipContent>
                </Tooltip>
              )}
              {canRequestAnulacion && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      size='icon'
                      aria-label='Solicitar anulación'
                      className='h-8 w-8 rounded-md text-muted-foreground hover:border-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30'
                      onClick={() => onAnularClick(venta)}
                    >
                      <Ban className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Solicitar anulación</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        )}
      </div>
    </article>
  );
}
