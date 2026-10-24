'use client';

import { BarStatsCards } from '@/components/bar/BarStatsCards';
import { ListLoadError } from '@/components/shared/ListLoadError';
import { MetricCard } from '@/components/shared/MetricCard';
import { Badge } from '@/components/ui/badge';
import type { ShotsSummary } from '@/modules/inventario/contracts';
import { AlertTriangle, Clock, PackageCheck, Wine } from 'lucide-react';
import type { ComponentProps } from 'react';

interface BarPageHeaderProps {
  stockError: boolean;
  isLoading: boolean;
  totalBar: number;
}

export function BarPageHeader({ stockError, isLoading, totalBar }: BarPageHeaderProps) {
  return (
    <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
      <div>
        <h1 className='flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl'>
          <Wine className='size-7 text-primary' aria-hidden='true' />
          Bar
        </h1>
        <p className='mt-2 text-sm text-muted-foreground'>
          Stock, botellas abiertas y movimientos del bar.
        </p>
      </div>
      <Badge variant='secondary' className='w-fit px-3 py-1.5'>
        {stockError
          ? 'Stock no disponible'
          : isLoading
            ? 'Cargando stock…'
            : `${totalBar} unidades en bar`}
      </Badge>
    </div>
  );
}

interface BarSummaryRowProps {
  tab: string;
  entregadosSesion: number;
  rechazadosSesion: number;
  envasesEnCola: number;
  sincronizandoEnvases: boolean;
  summaryError: boolean;
  onRetrySummary: () => void;
  resumen: ShotsSummary | null;
  botellasAbiertas?: ComponentProps<typeof BarStatsCards>['botellasAbiertas'];
}

export function BarSummaryRow({
  tab,
  entregadosSesion,
  rechazadosSesion,
  envasesEnCola,
  sincronizandoEnvases,
  summaryError,
  onRetrySummary,
  resumen,
  botellasAbiertas
}: BarSummaryRowProps) {
  if (tab === 'envases') {
    return (
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <MetricCard
          label='Entregados en esta sesión'
          badge='Envases'
          value={entregadosSesion}
          icon={<PackageCheck aria-hidden='true' />}
          tone='emerald'
        />
        <MetricCard
          label='Rechazados en esta sesión'
          badge='Envases'
          value={rechazadosSesion}
          icon={<AlertTriangle aria-hidden='true' />}
          tone='red'
        />
        <MetricCard
          label='Pendientes de verificar'
          badge='Sin conexión'
          value={envasesEnCola}
          icon={<Clock aria-hidden='true' />}
          tone='amber'
          footer={
            <p>{sincronizandoEnvases ? 'Sincronizando con el servidor…' : 'En cola local'}</p>
          }
        />
      </div>
    );
  }

  if (summaryError) {
    return (
      <ListLoadError message='No se pudo cargar el resumen del bar.' onRetry={onRetrySummary} />
    );
  }

  return <BarStatsCards resumen={resumen} botellasAbiertas={botellasAbiertas} />;
}
