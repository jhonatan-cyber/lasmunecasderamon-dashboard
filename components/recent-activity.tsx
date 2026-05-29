'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, DollarSign, LogIn, ShoppingCart, Sparkles } from 'lucide-react';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import logger from '@/lib/utils/logger';

interface RecentActivityItem {
  id: string;
  type: 'venta' | 'servicio' | 'pedido' | 'login' | string;
  description: string;
  amount: number | null;
  metadata: string | null;
  createdAt: string;
}

const ACTIVITY_STYLES = {
  venta: { icon: DollarSign, color: 'text-green-600' },
  servicio: { icon: Sparkles, color: 'text-purple-600' },
  pedido: { icon: ShoppingCart, color: 'text-orange-600' },
  login: { icon: LogIn, color: 'text-blue-600' },
  default: { icon: Activity, color: 'text-slate-600' }
} as const;

function formatRelativeTime(dateString: string) {
  const date = new Date(dateString);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / (1000 * 60));

  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
}

export function RecentActivity() {
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRecentActivity = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/stats/recent-activity', {
          cache: 'no-store'
        });
        const result = await response.json();

        if (active && result.success) {
          setActivities(result.data || []);
        }
      } catch (error) {
        logger.captureException(error, { context: 'RecentActivity:loadRecentActivity' });
        if (active) {
          setActivities([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadRecentActivity();

    return () => {
      active = false;
    };
  }, []);

  const content = useMemo(() => {
    if (loading) {
      return (
        <div className='space-y-4'>
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className='flex items-center gap-4 p-3 rounded-lg bg-gray-50'>
              <div className='h-10 w-10 animate-pulse rounded-full bg-gray-200' />
              <div className='flex-1 space-y-2'>
                <div className='h-4 w-40 animate-pulse rounded bg-gray-200' />
                <div className='h-3 w-24 animate-pulse rounded bg-gray-100' />
              </div>
              <div className='h-4 w-20 animate-pulse rounded bg-gray-200' />
            </div>
          ))}
        </div>
      );
    }

    if (activities.length === 0) {
      return (
        <div className='rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500'>
          No hay actividad reciente para mostrar.
        </div>
      );
    }

    return (
      <div className='space-y-4'>
        {activities.map(activity => {
          const config =
            ACTIVITY_STYLES[activity.type as keyof typeof ACTIVITY_STYLES] ||
            ACTIVITY_STYLES.default;
          const IconComponent = config.icon;

          return (
            <div
              key={activity.id}
              className='flex items-center gap-4 rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100'
            >
              <div className={`rounded-full bg-white p-2 shadow-sm ${config.color}`}>
                <IconComponent className='h-4 w-4' />
              </div>
              <div className='flex-1'>
                <p className='text-sm font-medium text-gray-900'>{activity.description}</p>
                <p className='text-xs text-gray-500'>{formatRelativeTime(activity.createdAt)}</p>
              </div>
              <div className='text-right'>
                <p className='text-sm font-semibold text-gray-900'>
                  {activity.amount !== null
                    ? formatCurrencyCLP(activity.amount)
                    : activity.metadata || '—'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  }, [activities, loading]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <Activity className='h-5 w-5' />
          Actividad Reciente
        </CardTitle>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
