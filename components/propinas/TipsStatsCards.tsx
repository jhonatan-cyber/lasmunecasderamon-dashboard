'use client';

import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Users, Wallet } from 'lucide-react';

interface TipsStatsCardsProps {
  totalTips: number;
  totalUsuarios: number;
  tipsPorUsuario: number;
  formatCurrency: (n: number) => string;
}

export default function TipsStatsCards({
  totalTips,
  totalUsuarios,
  tipsPorUsuario,
  formatCurrency
}: TipsStatsCardsProps) {
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
              <DollarSign className='h-4 w-4 text-emerald-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-emerald-700 bg-emerald-500/10 px-2 py-1 rounded-full'>
              Propinas
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-emerald-700/60 uppercase tracking-widest'>
              Total Propinas
            </p>
            <h3 className='text-xl font-black text-emerald-900 dark:text-emerald-100'>
              {formatCurrency(totalTips)}
            </h3>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-blue-500/20 rounded-2xl'>
              <Users className='h-4 w-4 text-blue-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-blue-700 bg-blue-500/10 px-2 py-1 rounded-full'>
              Personal
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-blue-700/60 uppercase tracking-widest'>
              Usuarios
            </p>
            <h3 className='text-xl font-black text-blue-900 dark:text-blue-100'>{totalUsuarios}</h3>
          </div>
        </CardContent>
      </Card>

      {}
      <Card
        style={{
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          border: '1px solid rgba(139, 92, 246, 0.2)'
        }}
        className='shadow-xs border-none backdrop-blur-xs rounded-3xl overflow-hidden group hover:scale-[1.02] transition-all duration-300'
      >
        <CardContent className='p-5'>
          <div className='flex items-center justify-between mb-4'>
            <div className='p-2.5 bg-violet-500/20 rounded-2xl'>
              <Wallet className='h-4 w-4 text-violet-600' />
            </div>
            <span className='text-[8px] font-black uppercase tracking-[0.2em] text-violet-700 bg-violet-500/10 px-2 py-1 rounded-full'>
              Promedio
            </span>
          </div>
          <div className='space-y-0.5'>
            <p className='text-[10px] font-bold text-violet-700/60 uppercase tracking-widest'>
              Por Usuario
            </p>
            <h3 className='text-xl font-black text-violet-900 dark:text-violet-100'>
              {formatCurrency(tipsPorUsuario)}
            </h3>
            <div className='flex items-center gap-1.5 pt-1'>
              <span className='text-[10px] text-violet-700/50 font-medium uppercase tracking-tighter italic'>
                Cajero y Garzón
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
