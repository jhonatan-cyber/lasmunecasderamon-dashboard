'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, GlassWater, History, ScanLine, Ticket } from 'lucide-react';

const barTabClassName =
  'cursor-pointer rounded-full gap-1.5 transition-[background-color,color,box-shadow] duration-200 motion-reduce:transition-none data-[state=inactive]:hover:bg-accent data-[state=inactive]:hover:text-accent-foreground data-[state=active]:hover:bg-primary/10 data-[state=active]:hover:shadow-md data-[state=active]:hover:ring-1 data-[state=active]:hover:ring-primary/30';

interface BarTabsListProps {
  /** Cantidad de transferencias pendientes que muestra el rótulo del tab. */
  pendientesCount: number;
  /** Muestra el tab de envases solo a quien puede devolver contenedores. */
  puedeDevolver: boolean;
}

export function BarTabsList({ pendientesCount, puedeDevolver }: BarTabsListProps) {
  return (
    <div className='flex justify-center overflow-x-auto pb-2'>
      <TabsList className='mx-auto h-auto w-max max-w-full justify-center gap-1 rounded-full p-1'>
        <TabsTrigger value='productos' className={barTabClassName}>
          Productos
        </TabsTrigger>
        <TabsTrigger value='pendientes' className={barTabClassName}>
          <Clock className='w-3.5 h-3.5' />
          Pendientes{pendientesCount > 0 ? ` (${pendientesCount})` : ''}
        </TabsTrigger>
        <TabsTrigger value='historial' className={barTabClassName}>
          <History className='w-3.5 h-3.5' />
          Historial
        </TabsTrigger>
        <TabsTrigger value='colaciones' className={barTabClassName}>
          <GlassWater className='w-3.5 h-3.5' />
          Colación
        </TabsTrigger>
        <TabsTrigger value='cortesias' className={barTabClassName}>
          <Ticket className='w-3.5 h-3.5' />
          Cortesías
        </TabsTrigger>
        {puedeDevolver && (
          <TabsTrigger value='envases' className={barTabClassName}>
            <ScanLine className='w-3.5 h-3.5' />
            Envases
          </TabsTrigger>
        )}
      </TabsList>
    </div>
  );
}
