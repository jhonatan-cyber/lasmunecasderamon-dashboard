import { Badge } from '@/components/ui/badge';

export const buildServicioCardDisplayData = (
  servicio: any,
  temporaryTimer: any,
  anfitrionasDelContexto: string | null | undefined
) => {
  if (temporaryTimer?.datosTemporales) {
    return {
      ...servicio,
      ...temporaryTimer.datosTemporales,
      id_servicio: temporaryTimer.datosTemporales.servicio_original_id ?? servicio.id_servicio
    };
  }

  return {
    ...servicio,
    anfitrionas_nombres: anfitrionasDelContexto || servicio.anfitrionas_nombres
  };
};

export const getServicioEstadoBadge = (estado: number) => {
  const estadoNum = Number(estado);

  switch (estadoNum) {
    case 0:
      return (
        <Badge className='rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-red-700 shadow-none dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300'>
          Anulado
        </Badge>
      );
    case 1:
      return (
        <Badge className='rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'>
          Finalizado
        </Badge>
      );
    case 2:
      return (
        <Badge className='rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 shadow-none dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300'>
          En Proceso
        </Badge>
      );
    case 3:
      return (
        <Badge className='rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 shadow-none dark:border-amber-900/60 dark:bg-amber-950/35 dark:text-amber-300'>
          Pausado
        </Badge>
      );
    case 4:
      return (
        <Badge className='rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-orange-700 shadow-none dark:border-orange-900/60 dark:bg-orange-950/35 dark:text-orange-300'>
          Solicitud Anulacion
        </Badge>
      );
    default:
      return (
        <Badge className='rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-700 shadow-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200'>
          Desconocido
        </Badge>
      );
  }
};
