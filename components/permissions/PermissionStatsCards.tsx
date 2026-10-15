'use client';
import { MetricCard } from '@/components/shared/MetricCard';

import { Key, Shield, Layers, Hash } from 'lucide-react';
import { Permission } from './PermissionTable';

interface PermissionStatsCardsProps {
  permissions: Permission[];
}

export function PermissionStatsCards({ permissions }: PermissionStatsCardsProps) {
  const stats = {
    total: permissions?.length || 0,
    modulosActivos: (permissions || []).filter(p => p.module).length,
    modulosUnicos: new Set((permissions || []).map(p => p.module)).size
  };

  const actionsCount = (permissions || []).reduce((acc, p) => {
    if (p.action) acc.add(p.action);
    return acc;
  }, new Set<string>()).size;

  return (
    <div className='grid gap-4 grid-cols-1 md:grid-cols-4 mb-6'>
      {}
      <MetricCard
        tone='blue'
        icon={<Key className='h-4 w-4 text-blue-600' />}
        badge='Total'
        label='Permisos'
        value={stats.total}
      />

      {}
      <MetricCard
        tone='emerald'
        icon={<Shield className='h-4 w-4 text-emerald-600' />}
        badge='Activos'
        label='Módulos'
        value={stats.modulosActivos}
      />

      {}
      <MetricCard
        tone='amber'
        icon={<Layers className='h-4 w-4 text-amber-600' />}
        badge='Únicos'
        label='Módulos'
        value={stats.modulosUnicos}
      />

      {}
      <MetricCard
        tone='violet'
        icon={<Hash className='h-4 w-4 text-violet-600' />}
        badge='Tipos'
        label='Acciones'
        value={actionsCount}
      />
    </div>
  );
}
