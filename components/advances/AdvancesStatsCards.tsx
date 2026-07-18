'use client';

import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { Anticipo } from '@/hooks/personal';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface AdvancesStatsCardsProps {
  advances: Anticipo[];
}

export default function AdvancesStatsCards({ advances }: AdvancesStatsCardsProps) {
  const stats = {
    aceptados: (advances || []).filter(a => Number(a.estado) === 1 || Number(a.estado) === 0),
    pendientes: (advances || []).filter(a => Number(a.estado) === 2),
    rechazados: (advances || []).filter(a => Number(a.estado) === 3)
  };

  const totals = {
    montoAceptados: stats.aceptados.reduce((acc, a) => acc + Number(a.monto), 0),
    montoPendientes: stats.pendientes.reduce((acc, a) => acc + Number(a.monto), 0),
    montoRechazados: stats.rechazados.reduce((acc, a) => acc + Number(a.monto), 0),
    countAceptados: stats.aceptados.length,
    countPendientes: stats.pendientes.length,
    countRechazados: stats.rechazados.length
  };

  return (
    <div className='grid gap-4 grid-cols-1 md:grid-cols-3 mb-6'>
      {}
      <Card
        style={{
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-emerald-500/20 rounded-2xl'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Aceptados
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Total Aprobado
            </p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {formatCurrencyCLP(totals.montoAceptados)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-emerald-700 font-black text-sm'>{totals.countAceptados}</span>
              <span className='text-[10px] text-emerald-700/50 font-medium uppercase tracking-tighter italic'>
                Solicitudes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '1px solid rgba(245, 158, 11, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-amber-500/20 rounded-2xl'>
              <Clock className='h-4 w-4 text-amber-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-amber-700 bg-amber-500/10 px-2 py-1 rounded-full'>
              Pendientes
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-amber-700/60 uppercase tracking-widest'>
              En Espera
            </p>
            <h3 className='text-xl font-black text-amber-900 dark:text-amber-100'>
              {formatCurrencyCLP(totals.montoPendientes)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-amber-700 font-black text-sm'>{totals.countPendientes}</span>
              <span className='text-[10px] text-amber-700/50 font-medium uppercase tracking-tighter italic'>
                Solicitudes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(244, 63, 94, 0.1)',
          border: '1px solid rgba(244, 63, 94, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-rose-500/20 rounded-2xl'>
              <XCircle className='h-4 w-4 text-rose-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-rose-700 bg-rose-500/10 px-2 py-1 rounded-full'>
              Rechazados
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-rose-700/60 uppercase tracking-widest'>
              Rechazado
            </p>
            <h3 className='text-xl font-black text-rose-900 dark:text-rose-100'>
              {formatCurrencyCLP(totals.montoRechazados)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-rose-700 font-black text-sm'>{totals.countRechazados}</span>
              <span className='text-[10px] text-rose-700/50 font-medium uppercase tracking-tighter italic'>
                Solicitudes
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
