'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Anticipo } from '@/hooks/staff';

export function useAdvancesTable(
  advances: Anticipo[],
  activeTab: 'solicitudes' | 'porCobrar' | 'cobrado'
) {
  // Solicitudes: pendientes de aprobación (2) o rechazados (3)
  const solicitudesAdvances = useMemo(
    () => advances.filter(a => Number(a.estado) === 2 || Number(a.estado) === 3),
    [advances]
  );

  // Por Cobrar: aprobados y entregados el dinero (estado 1 con fecha_entrega)
  const porCobrarAdvances = useMemo(
    () => advances.filter(a => Number(a.estado) === 1 && !!a.fecha_entrega),
    [advances]
  );

  // Cobrados: descontados en planilla (estado 0 o con fecha_cobro)
  const cobradoAdvances = useMemo(
    () => advances.filter(a => Number(a.estado) === 0 || !!a.fecha_cobro),
    [advances]
  );

  const filteredAdvances = useMemo(() => {
    if (activeTab === 'solicitudes') return solicitudesAdvances;
    if (activeTab === 'porCobrar') return porCobrarAdvances;
    return cobradoAdvances;
  }, [activeTab, solicitudesAdvances, porCobrarAdvances, cobradoAdvances]);

  const getStatusBadge = (estado: number, anticipo: Anticipo) => {
    if (anticipo.fecha_cobro) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-purple-100 text-purple-700 border-none hover:bg-purple-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Cobrado
        </Badge>
      );
    }

    if (anticipo.fecha_entrega) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-emerald-100 text-emerald-700 border-none hover:bg-emerald-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Entregado
        </Badge>
      );
    }

    if (Number(estado) === 1) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-green-100 text-green-700 border-none hover:bg-green-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Aprobado
        </Badge>
      );
    }

    if (Number(estado) === 2) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-blue-100 text-blue-700 border-none hover:bg-blue-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Pendiente
        </Badge>
      );
    }

    if (Number(estado) === 3) {
      return (
        <Badge className='rounded-full px-3 py-1 bg-rose-100 text-rose-700 border-none hover:bg-rose-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
          Rechazado
        </Badge>
      );
    }

    return (
      <Badge className='rounded-full px-3 py-1 bg-amber-100 text-amber-700 border-none hover:bg-amber-100 flex items-center gap-1 w-fit mx-auto lg:mx-0 font-bold uppercase tracking-tighter text-[10px]'>
        Por Cobrar
      </Badge>
    );
  };

  return {
    filteredAdvances,
    getStatusBadge
  };
}
