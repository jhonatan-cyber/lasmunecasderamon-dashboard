'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import {
  ArrowRight,
  CreditCard,
  DoorOpen,
  PackagePlus,
  Receipt,
  ShoppingCart,
  Wallet
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';
import { useCashRegisterStatus } from '@/hooks/caja/useCashRegisterStatus';
import { cn } from '@/lib/utils/utils';

type QuickAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  module?: string;
  action?: string;
  requiresOpenCaja?: boolean;
  tone: 'dark' | 'blue' | 'emerald';
};

const toneStyles = {
  dark: {
    card: 'bg-slate-950 text-white hover:bg-slate-900 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-white',
    icon: 'bg-white/10 text-white dark:bg-slate-900/10 dark:text-slate-900',
    arrow: 'text-white/70 dark:text-slate-700'
  },
  blue: {
    card: 'bg-blue-50 text-blue-950 hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-100 dark:hover:bg-blue-950/50',
    icon: 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200',
    arrow: 'text-blue-500 dark:text-blue-300'
  },
  emerald: {
    card: 'bg-emerald-50 text-emerald-950 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-100 dark:hover:bg-emerald-950/50',
    icon: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200',
    arrow: 'text-emerald-500 dark:text-emerald-300'
  }
} as const;

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'cash-register',
    title: 'Caja',
    description: 'Abrir, revisar o cerrar la caja actual.',
    href: '/cash-register',
    icon: Wallet,
    module: 'cash_register',
    action: 'view',
    tone: 'dark'
  },
  {
    id: 'new-sale',
    title: 'Nueva venta',
    description: 'Registrar una venta nueva del turno.',
    href: '/sales/new',
    icon: ShoppingCart,
    module: 'sales',
    action: 'create',
    requiresOpenCaja: true,
    tone: 'blue'
  },
  {
    id: 'new-order',
    title: 'Nuevo pedido',
    description: 'Crear un pedido para cocina o atención.',
    href: '/orders/new',
    icon: Receipt,
    module: 'orders',
    action: 'create',
    requiresOpenCaja: true,
    tone: 'blue'
  },
  {
    id: 'new-account',
    title: 'Nueva cuenta',
    description: 'Iniciar una cuenta con consumos del cliente.',
    href: '/accounts/new',
    icon: CreditCard,
    module: 'accounts',
    action: 'create',
    requiresOpenCaja: true,
    tone: 'emerald'
  },
  {
    id: 'new-private-room',
    title: 'Nuevo privado',
    description: 'Generar un nuevo servicio privado.',
    href: '/private-rooms/new',
    icon: DoorOpen,
    module: 'private_rooms',
    action: 'create',
    requiresOpenCaja: true,
    tone: 'emerald'
  },
  {
    id: 'rooms',
    title: 'Habitaciones',
    description: 'Ver disponibilidad y estado del local.',
    href: '/rooms',
    icon: PackagePlus,
    module: 'rooms',
    action: 'view',
    tone: 'blue'
  }
];

export default function QuickActions() {
  const { user } = useCurrentUser();
  const { hasPermission } = useUserPermissions();
  const { hasOpenCaja, loading: cajaLoading } = useCashRegisterStatus();

  const isAdmin = user?.role?.toLowerCase() === 'administrador';

  const visibleActions = useMemo(
    () =>
      QUICK_ACTIONS.filter(action => {
        if (isAdmin) return true;
        if (!action.module || !action.action) return true;
        return hasPermission(action.module, action.action);
      }),
    [hasPermission, isAdmin]
  );

  if (!visibleActions.length) {
    return null;
  }

  return (
    <section className='space-y-4'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <h2 className='text-xl font-semibold text-slate-900 dark:text-slate-100'>
            Acciones rápidas
          </h2>
          <p className='mt-1 text-sm text-slate-600 dark:text-slate-400'>
            Accesos directos para resolver tareas frecuentes sin navegar por todo el sistema.
          </p>
        </div>
        <Badge className='w-fit rounded-full bg-slate-100 px-3 py-1 text-slate-700 dark:bg-slate-800 dark:text-slate-200'>
          {cajaLoading ? 'Verificando caja' : hasOpenCaja ? 'Caja habilitada' : 'Caja requerida'}
        </Badge>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-3'>
        {visibleActions.map(action => {
          const tone = toneStyles[action.tone];
          const Icon = action.icon;
          const isDisabled = Boolean(action.requiresOpenCaja && !cajaLoading && !hasOpenCaja);

          const content = (
            <Card
              className={cn(
                'h-full border-slate-200/80 transition-all duration-200 dark:border-slate-800',
                isDisabled ? 'opacity-60' : 'hover:-translate-y-0.5 hover:shadow-md'
              )}
            >
              <CardContent className={cn('flex h-full flex-col rounded-2xl p-5', tone.card)}>
                <div className='flex items-start justify-between gap-3'>
                  <div
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl',
                      tone.icon
                    )}
                  >
                    <Icon className='h-5 w-5' />
                  </div>
                  <ArrowRight className={cn('h-4 w-4', tone.arrow)} />
                </div>

                <div className='mt-5 flex-1'>
                  <h3 className='text-lg font-semibold'>{action.title}</h3>
                  <p className='mt-2 text-sm opacity-80'>{action.description}</p>
                </div>

                <div className='mt-4 flex items-center justify-between'>
                  {isDisabled ? (
                    <Badge className='rounded-full bg-white/15 px-3 py-1 text-white dark:bg-slate-900/10 dark:text-slate-800'>
                      Requiere caja abierta
                    </Badge>
                  ) : (
                    <Badge className='rounded-full bg-white/15 px-3 py-1 text-white dark:bg-slate-900/10 dark:text-slate-800'>
                      Ir ahora
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );

          if (isDisabled) {
            return (
              <div key={action.id} className='cursor-not-allowed'>
                {content}
              </div>
            );
          }

          return (
            <Link key={action.id} href={action.href} className='block'>
              {content}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
