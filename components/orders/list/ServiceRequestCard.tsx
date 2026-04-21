import { Trash2, Clock, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SolicitudServicio } from '@/hooks/orders/useOrdersList';
import { formatNumberCL } from '@/lib/utils/formatters';

interface ServiceRequestCardProps {
  servicio: SolicitudServicio;
  canDelete: boolean;
  onServicioClick: (s: SolicitudServicio) => void;
  onDeleteClick: (e: React.MouseEvent, s: SolicitudServicio) => void;
}

export const ServiceRequestCard = ({
  servicio,
  canDelete,
  onServicioClick,
  onDeleteClick
}: ServiceRequestCardProps) => {
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return <Badge className='border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-900/70 dark:bg-yellow-950/40 dark:text-yellow-300'>Pendiente</Badge>;
      case 'aprobada':
        return <Badge className='border-green-200 bg-green-50 text-green-700 dark:border-green-900/70 dark:bg-green-950/40 dark:text-green-300'>Aprobada</Badge>;
      case 'rechazada':
        return <Badge className='border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300'>Rechazada</Badge>;
      default:
        return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  return (
    <div
      className='group cursor-pointer rounded-xl border border-gray-100 bg-white p-5 shadow-sm transition-all hover:border-gray-200 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/95 dark:hover:border-zinc-700 dark:hover:shadow-black/20'
      onClick={() => onServicioClick(servicio)}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          <div className='flex items-center gap-3 mb-4'>
            <div className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-xs font-black text-white dark:bg-zinc-100 dark:text-zinc-950'>
              #{servicio.id_solicitud}
            </div>
            {getStatusBadge(servicio.estado)}
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-gray-50 p-2 transition-colors group-hover:bg-blue-50 dark:bg-zinc-800/80 dark:group-hover:bg-blue-950/40'>
                <MapPin className='h-4 w-4 text-gray-400 group-hover:text-blue-500 dark:text-zinc-500 dark:group-hover:text-blue-300' />
              </div>
              <div className='flex flex-col'>
                <span className='text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500'>Habitación</span>
                <span className='text-sm font-bold text-gray-700 dark:text-zinc-200'>
                  {servicio.habitacion_nombre}
                </span>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-gray-50 p-2 transition-colors group-hover:bg-green-50 dark:bg-zinc-800/80 dark:group-hover:bg-green-950/40'>
                <User className='h-4 w-4 text-gray-400 group-hover:text-green-500 dark:text-zinc-500 dark:group-hover:text-green-300' />
              </div>
              <div className='flex flex-col'>
                <span className='text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500'>Solicitante</span>
                <span className='text-sm font-bold text-gray-700 dark:text-zinc-200'>
                  {servicio.solicitado_por_nick}
                </span>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-gray-50 p-2 transition-colors group-hover:bg-purple-50 dark:bg-zinc-800/80 dark:group-hover:bg-fuchsia-950/40'>
                <Clock className='h-4 w-4 text-gray-400 group-hover:text-purple-500 dark:text-zinc-500 dark:group-hover:text-fuchsia-300' />
              </div>
              <div className='flex flex-col'>
                <span className='text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500'>Tiempo</span>
                <span className='text-sm font-bold text-gray-700 dark:text-zinc-200'>{servicio.tiempo} min</span>
              </div>
            </div>

            <div className='flex items-center gap-2'>
              <div className='rounded-lg bg-gray-50 p-2 transition-colors group-hover:bg-emerald-50 dark:bg-zinc-800/80 dark:group-hover:bg-emerald-950/40'>
                <span className='font-bold text-gray-400 group-hover:text-emerald-500 dark:text-zinc-500 dark:group-hover:text-emerald-300'>$</span>
              </div>
              <div className='flex flex-col'>
                <span className='text-[9px] font-black uppercase text-gray-400 dark:text-zinc-500'>Costo total</span>
                <span className='text-sm font-black text-emerald-700 dark:text-emerald-300'>
                  ${formatNumberCL(servicio.total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {canDelete && (
          <div className='ml-4'>
            <Button
              size='sm'
              variant='ghost'
              className='h-9 w-9 rounded-full p-0 text-gray-300 transition-all duration-300 hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/40 dark:hover:text-red-300'
              onClick={e => onDeleteClick(e, servicio)}
            >
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

