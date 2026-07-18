'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Eye,
  Ban,
  Package,
  MapPin,
  Beer,
  Banknote,
  CreditCard,
  Landmark,
  Ticket,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  type LucideIcon,
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
  onAnularClick: (venta: VentaWithDetails) => void;
}

interface StatusTheme {
  bg: string;
  badgeBg: string;
  badgeText: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  titleColor: string;
  textColor: string;
  mutedColor: string;
  border: string;
  badgeDot: string;
}

const statusTheme: Record<number, StatusTheme> = {
  1: {
    bg: 'rgba(16, 185, 129, 0.08)',
    badgeBg: 'bg-emerald-500/15',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
    badgeDot: 'bg-emerald-500',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    titleColor: 'text-emerald-900 dark:text-emerald-100',
    textColor: 'text-emerald-800 dark:text-emerald-200',
    mutedColor: 'text-emerald-700/50 dark:text-emerald-400/50',
    border: 'border-emerald-500/20',
  },
  2: {
    bg: 'rgba(59, 130, 246, 0.08)',
    badgeBg: 'bg-blue-500/15',
    badgeText: 'text-blue-700 dark:text-blue-400',
    badgeDot: 'bg-blue-500',
    icon: Clock,
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
    titleColor: 'text-blue-900 dark:text-blue-100',
    textColor: 'text-blue-800 dark:text-blue-200',
    mutedColor: 'text-blue-700/50 dark:text-blue-400/50',
    border: 'border-blue-500/20',
  },
  3: {
    bg: 'rgba(245, 158, 11, 0.08)',
    badgeBg: 'bg-amber-500/15',
    badgeText: 'text-amber-700 dark:text-amber-400',
    badgeDot: 'bg-amber-500',
    icon: AlertCircle,
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
    titleColor: 'text-amber-900 dark:text-amber-100',
    textColor: 'text-amber-800 dark:text-amber-200',
    mutedColor: 'text-amber-700/50 dark:text-amber-400/50',
    border: 'border-amber-500/20',
  },
  0: {
    bg: 'rgba(244, 63, 94, 0.08)',
    badgeBg: 'bg-rose-500/15',
    badgeText: 'text-rose-700 dark:text-rose-400',
    badgeDot: 'bg-rose-500',
    icon: XCircle,
    iconBg: 'bg-rose-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
    titleColor: 'text-rose-900 dark:text-rose-100',
    textColor: 'text-rose-800 dark:text-rose-200',
    mutedColor: 'text-rose-700/50 dark:text-rose-400/50',
    border: 'border-rose-500/20',
  },
};

const metodoPagoIcons: Record<string, LucideIcon> = {
  efectivo: Banknote,
  tarjeta: CreditCard,
  transferencia: Landmark,
  prepago: Ticket,
};

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
  onAnularClick,
}: SalesListItemProps) {
  const estadoNum =
    venta?.estado !== null && venta?.estado !== undefined ? Number(venta.estado) : 1;
  const t = statusTheme[estadoNum] || statusTheme[1];
  const StatusIcon = t.icon;
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
        year: 'numeric',
      })
    : '';
  const horaStr = venta?.fecha_crea
    ? new Date(venta.fecha_crea).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const ubicacion = venta.habitacion_nombre || (venta as any).habitacion_numero;
  const PagoIcon = metodoPagoIcons[venta?.metodo_pago] || Banknote;
  const canRequestAnulacion =
    canAnular &&
    Number(venta?.estado) !== 0 &&
    Number(venta?.estado) !== 3 &&
    !Boolean((venta as any)?.has_anulacion_solicitada);

  return (
    <div
      style={{ backgroundColor: t.bg, border: `1px solid ${t.bg.replace('0.08', '0.15')}` }}
      className='rounded-4xl border-none shadow-xs backdrop-blur-xs overflow-hidden
        hover:scale-[1.02] hover:shadow-md transition-all duration-300 group'
    >
      <div className='p-5 sm:p-6 overflow-hidden'>
        {/* Header: icon + status */}
        <div className='flex items-center justify-between mb-4'>
          <div className={`p-3 ${t.iconBg} rounded-2xl`}>
            <StatusIcon className={`h-5 w-5 ${t.iconColor}`} />
          </div>
          <div className='flex items-center gap-2'>
            {(fechaStr || horaStr) && (
              <span className='text-xs text-gray-400 dark:text-slate-500 font-medium'>
                {fechaStr}{' '}
                <span className='text-gray-600 dark:text-slate-400 font-bold'>{horaStr}</span>
              </span>
            )}
            <span
              className={`text-[10px] font-black uppercase tracking-[0.15em] ${t.badgeText} ${t.badgeBg} px-2.5 py-1 rounded-full flex items-center gap-1`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${t.badgeDot} ${estadoNum === 2 ? 'animate-pulse' : ''}`}
              />
              {statusLabels[estadoNum]}
            </span>
          </div>
        </div>

        {/* Code + Total */}
        <div className='mb-4'>
          <p className={`text-xs font-bold ${t.mutedColor} uppercase tracking-widest mb-0.5`}>
            {venta?.codigo || '—'}
          </p>
          <h3
            className={`text-3xl sm:text-4xl font-black ${t.titleColor} tabular-nums tracking-tight leading-none`}
          >
            ${formatCurrency(venta?.total || 0)}
          </h3>
        </div>

        {/* Details box */}
        <div className='rounded-2xl bg-white/60 dark:bg-slate-950/30 p-4 space-y-3 mb-4'>
          {/* Client + Location */}
          <div className='flex items-center justify-between'>
            <span className={`text-base font-bold ${t.textColor} truncate max-w-[55%]`}>
              {venta.cliente_nombre || 'Sin cliente'}
            </span>
            {ubicacion ? (
              <span className={`inline-flex items-center gap-1 text-sm ${t.textColor} font-semibold`}>
                <MapPin className='w-4 h-4' />
                {ubicacion}
              </span>
            ) : (
              <span className='inline-flex items-center gap-1 text-sm text-gray-400 dark:text-slate-500 font-medium'>
                <Beer className='w-4 h-4' /> Barra
              </span>
            )}
          </div>

          {/* Items + Payment + Tip */}
          <div className='flex items-center gap-3'>
            <span className={`inline-flex items-center gap-1 text-xs ${t.mutedColor} font-medium`}>
              <Package className='w-3.5 h-3.5' />
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
            <span className={`inline-flex items-center gap-1 text-xs ${t.mutedColor} font-medium`}>
              <PagoIcon className='w-4 h-4' />
              {metodoPagoLabels[venta?.metodo_pago as keyof typeof metodoPagoLabels] || 'Efectivo'}
            </span>
            {propina > 0 && (
              <span className={`text-xs font-bold ${t.textColor} ${t.badgeBg} px-2 py-0.5 rounded-full ml-auto`}>
                +{formatCurrency(propina)} prop
              </span>
            )}
          </div>

          {/* Hostesses */}
          <div className='flex flex-wrap items-center gap-1.5'>
            {anfitrionasNicks.length > 0 ? (
              anfitrionasNicks.map((nick: string, uIdx: number) => (
                <Badge
                  key={uIdx}
                  className={`${anfitrionaColors[uIdx % anfitrionaColors.length]} text-xs rounded-full font-bold px-3 py-0.5 h-6`}
                >
                  {nick}
                </Badge>
              ))
            ) : (
              <span className='text-xs text-gray-300 dark:text-slate-600 italic'>Sin anfitrionas</span>
            )}
          </div>
        </div>

        {/* Actions */}
        {hasAnyAction && (
          <div className='flex gap-2'>
            {canViewDetails && (
              <Button
                variant='outline'
                size='sm'
                className='flex-1 h-10 rounded-2xl text-xs font-bold gap-1.5 transition-colors'
                style={{
                  borderColor: t.bg.replace('0.08', '0.2'),
                  color: estadoNum === 1 ? '#059669' : estadoNum === 2 ? '#2563eb' : estadoNum === 3 ? '#d97706' : '#e11d48',
                }}
                onClick={() => onVerDetalles(venta?.id)}
              >
                <Eye className='h-4 w-4' />
                Detalles
              </Button>
            )}
            {canRequestAnulacion && (
              <Button
                variant='ghost'
                size='sm'
                className='flex-1 h-10 rounded-2xl text-xs font-bold gap-1.5
                  text-gray-400 dark:text-slate-500
                  hover:text-rose-600 dark:hover:text-rose-400
                  hover:bg-rose-50 dark:hover:bg-rose-950/30'
                onClick={() => onAnularClick(venta)}
              >
                <Ban className='h-4 w-4' />
                Anular
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
