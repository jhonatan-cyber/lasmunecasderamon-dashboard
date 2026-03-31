"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Key, Shield, Layers, Hash } from "lucide-react";
import { Permission } from "./PermissionTable";

interface PermissionStatsCardsProps {
  permissions: Permission[];
}

export function PermissionStatsCards({ permissions }: PermissionStatsCardsProps) {
  const stats = {
    total: permissions?.length || 0,
    modulosActivos: (permissions || []).filter(p => p.module).length,
    modulosUnicos: new Set((permissions || []).map(p => p.module)).size,
  };

  const actionsCount = (permissions || []).reduce((acc, p) => {
    if (p.action) acc.add(p.action);
    return acc;
  }, new Set<string>()).size;

  return (
    <div className='grid gap-4 grid-cols-1 md:grid-cols-4 mb-6'>
      {/* Total Permisos */}
      <Card
        style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <Key className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full'>
              Total
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>Permisos</p>
            <h3 className='text-xl font-black text-blue-900 dark:text-blue-100'>
              {stats.total}
            </h3>
          </div>
        </CardContent>
      </Card>

      {/* Módulos Activos */}
      <Card
        style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <Shield className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Activos
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>Módulos</p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {stats.modulosActivos}
            </h3>
          </div>
        </CardContent>
      </Card>

      {/* Módulos Únicos */}
      <Card
        style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-amber-500/20 rounded-2xl'>
              <Layers className='h-4 w-4 text-amber-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full'>
              Únicos
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-amber-700/60 uppercase tracking-widest'>Módulos</p>
            <h3 className='text-xl font-black text-amber-900 dark:text-amber-100'>
              {stats.modulosUnicos}
            </h3>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Únicas */}
      <Card
        style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.2)' }}
        className='shadow-sm border-none backdrop-blur-sm rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-violet-500/20 rounded-2xl'>
              <Hash className='h-4 w-4 text-violet-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-violet-700 bg-violet-500/10 px-2 py-1 rounded-full'>
              Tipos
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-violet-700/60 uppercase tracking-widest'>Acciones</p>
            <h3 className='text-xl font-black text-violet-900 dark:text-violet-100'>
              {actionsCount}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}