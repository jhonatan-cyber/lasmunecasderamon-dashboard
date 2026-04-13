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
  servicio, canDelete, onServicioClick, onDeleteClick
}: ServiceRequestCardProps) => {
  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return <Badge className='bg-yellow-50 text-yellow-700 border-yellow-200'>Pendiente</Badge>;
      case 'aprobada': return <Badge className='bg-green-50 text-green-700 border-green-200'>Aprobada</Badge>;
      case 'rechazada': return <Badge className='bg-red-50 text-red-700 border-red-200'>Rechazada</Badge>;
      default: return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  return (
    <div
      className='p-5 border border-gray-100 rounded-xl bg-white shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group'
      onClick={() => onServicioClick(servicio)}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          <div className='flex items-center gap-3 mb-4'>
            <div className="bg-gray-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs">
              #{servicio.id_solicitud}
            </div>
            {getStatusBadge(servicio.estado)}
          </div>
          
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                <MapPin className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase">Habitación</span>
                <span className="text-sm font-bold text-gray-700">{servicio.habitacion_nombre}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-green-50 transition-colors">
                <User className="w-4 h-4 text-gray-400 group-hover:text-green-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase">Solicitante</span>
                <span className="text-sm font-bold text-gray-700">{servicio.solicitado_por_nick}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-purple-50 transition-colors">
                <Clock className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase">Tiempo</span>
                <span className="text-sm font-bold text-gray-700">{servicio.tiempo} min</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-emerald-50 transition-colors">
                <span className="text-gray-400 group-hover:text-emerald-500 font-bold">$</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-gray-400 uppercase">Costo total</span>
                <span className="text-sm font-black text-emerald-700">${formatNumberCL(servicio.total)}</span>
              </div>
            </div>
          </div>
        </div>

        {canDelete && (
          <div className='ml-4'>
            <Button
              size='sm'
              variant='ghost'
              className='rounded-full w-9 h-9 p-0 text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all duration-300'
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
