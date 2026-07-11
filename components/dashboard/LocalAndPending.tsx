'use client';

import Link from 'next/link';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BellRing,
  DoorOpen,
  Receipt,
  Wallet,
  Clock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboardComposite } from '@/hooks/stats/useDashboardComposite';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { cn } from '@/lib/utils/utils';

function StatusChip({
  icon: Icon,
  label,
  badge,
  badgeVariant = 'default'
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge: string;
  badgeVariant?: 'default' | 'success' | 'warning' | 'critical';
}) {
  const variants = {
    default:
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
    critical: 'bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400'
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all duration-200 hover:scale-105',
        variants[badgeVariant]
      )}
    >
      <Icon className='h-3.5 w-3.5' />
      <span className='text-[10px] font-black uppercase tracking-widest'>{label}</span>
      <div className='h-3 w-px bg-current opacity-20 mx-0.5' />
      <span className='text-[11px] font-black'>{badge}</span>
    </div>
  );
}

function PendingRow({
  item
}: {
  item: {
    id: string;
    code: string;
    title: string;
    subtitle: string;
    amount: number;
    createdAt: string;
    href: string;
  };
}) {
  return (
    <Link
      href={item.href}
      className='group flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-white/50 p-2.5 transition-all hover:bg-slate-50 hover:border-slate-300 dark:border-slate-800/60 dark:bg-slate-950/20 dark:hover:bg-slate-900/40 dark:hover:border-slate-700'
    >
      <div className='flex items-center gap-3 min-w-0'>
        <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-500/10 group-hover:text-emerald-500 transition-colors'>
          <Receipt className='h-4 w-4' />
        </div>
        <div className='flex flex-col truncate'>
          <span className='text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight'>
            {item.code}
          </span>
          <span className='truncate text-[10px] font-bold text-slate-500 uppercase tracking-tighter'>
            {item.subtitle}
          </span>
        </div>
      </div>

      <div className='flex items-center gap-4'>
        <div className='flex flex-col items-end'>
          <span className='text-xs font-black text-slate-900 dark:text-white'>
            {formatCurrencyCLP(item.amount)}
          </span>
          <div className='flex items-center gap-1 opacity-40'>
            <Clock className='h-2.5 w-2.5' />
            <span className='text-[9px] font-black uppercase'>Hace poco</span>
          </div>
        </div>
        <div className='flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-500 group-hover:text-white transition-all'>
          <ArrowRight className='h-3 w-3' />
        </div>
      </div>
    </Link>
  );
}

export default function LocalAndPending() {
  const { data: composite, isLoading, error } = useDashboardComposite();
  const { user } = useCurrentUser();
  const { hasPermission } = useUserPermissions();

  const insights = composite?.insights;
  const pendingData = composite?.pendingItems;

  const isAdmin = user?.role?.toLowerCase() === 'administrador';
  const canProcessOrders = isAdmin || hasPermission('orders', 'process');

  const rooms = insights?.localStatus.rooms;
  const cash = insights?.localStatus.cash;
  const ordersOpen = insights?.localStatus.orders.open || 0;
  const serviceRequests = insights?.localStatus.orders.serviceRequests || 0;

  if (isLoading) {
    return (
      <div className='space-y-4'>
        <div className='flex gap-2 overflow-x-auto pb-1'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-8 w-24 rounded-xl' />
          ))}
        </div>
        <div className='space-y-2'>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className='h-12 w-full rounded-xl' />
          ))}
        </div>
      </div>
    );
  }

  if (error || !insights) {
    return (
      <div className='rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200'>
        Error al cargar estado operativo.
      </div>
    );
  }

  const statusItems = [
    {
      icon: DoorOpen,
      label: 'Salas',
      badge: `${rooms?.occupied || 0}/${rooms?.total || 0}`,
      badgeVariant:
        (rooms?.occupancyRate || 0) > 80
          ? 'critical'
          : (rooms?.occupancyRate || 0) > 50
            ? 'warning'
            : 'success'
    },
    {
      icon: Wallet,
      label: 'Caja',
      badge: cash?.openRegisters ? 'ACTIVA' : 'CERRADA',
      badgeVariant: cash?.openRegisters ? 'success' : 'critical'
    },
    {
      icon: Receipt,
      label: 'Pedidos',
      badge: String(ordersOpen),
      badgeVariant: ordersOpen > 0 ? 'critical' : 'success'
    },
    {
      icon: BellRing,
      label: 'Llamados',
      badge: String(serviceRequests),
      badgeVariant: serviceRequests > 0 ? 'warning' : 'success'
    }
  ];

  const pendingItems = [
    ...(pendingData?.orders || []).slice(0, 4),
    ...(canProcessOrders ? (pendingData?.serviceRequests || []).slice(0, 2) : [])
  ];

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap gap-2'>
        {statusItems.map(item => (
          <StatusChip key={item.label} {...(item as any)} />
        ))}
      </div>

      {pendingItems.length > 0 ? (
        <div className='flex flex-col gap-2'>
          {pendingItems.map(item => (
            <PendingRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className='flex flex-col items-center justify-center py-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/10'>
          <div className='p-2 bg-white dark:bg-slate-800 rounded-full mb-2 shadow-sm'>
            <Activity className='h-4 w-4 text-slate-300' />
          </div>
          <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>
            Todo bajo control
          </p>
        </div>
      )}
    </div>
  );
}
