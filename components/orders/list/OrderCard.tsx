import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Order } from '@/hooks/orders/useOrdersList';
import { formatNumberCL } from '@/lib/utils/formatters';

interface OrderCardProps {
  order: Order;
  canDelete: boolean;
  canProcess: boolean;
  hasOpenCaja: boolean | null;
  onOrderClick: (id: number, code: string) => void;
  onDeleteClick: (e: React.MouseEvent, order: Order) => void;
}

export const OrderCard = ({
  order,
  canDelete,
  canProcess,
  hasOpenCaja,
  onOrderClick,
  onDeleteClick
}: OrderCardProps) => {
  const getStatusBadge = (estado: number) => {
    switch (estado) {
      case 0:
        return <Badge variant='default'>Completado</Badge>;
      case 1:
        return <Badge className='bg-red-300 text-red-900 font-medium'>Pendiente</Badge>;
      case 2:
        return <Badge variant='destructive'>Cancelado</Badge>;
      default:
        return <Badge variant='outline'>Desconocido</Badge>;
    }
  };

  const nicksArr = order.nicks ? order.nicks.split(',') : [];

  return (
    <div
      className={`p-4 border border-gray-100 dark:border-gray-800 rounded-xl transition-all duration-200 bg-white shadow-sm ${
        canProcess
          ? 'hover:shadow-md hover:border-gray-200 cursor-pointer'
          : 'cursor-not-allowed opacity-60 grayscale'
      }`}
      onClick={canProcess ? () => onOrderClick(order.id_pedido, order.codigo) : undefined}
    >
      <div className='flex items-center justify-between'>
        <div className='flex-1'>
          <div className='flex items-center gap-3 mb-3'>
            <h3 className='font-black text-gray-900 dark:text-white tracking-tight'>
              {order.codigo}
            </h3>
            {getStatusBadge(order.estado)}
            {!canProcess && (
              <Badge className='bg-gray-100 text-gray-500 text-[10px] font-bold uppercase'>
                Sin permiso
              </Badge>
            )}
            {canProcess && !hasOpenCaja && (
              <Badge className='bg-yellow-50 text-yellow-700 text-[10px] font-bold uppercase border-yellow-200 border'>
                Sin caja abierta
              </Badge>
            )}
          </div>

          <div className='grid grid-cols-2 md:grid-cols-3 gap-6 text-[12px] text-gray-500'>
            <div className='flex flex-col'>
              <span className='font-black text-gray-400 uppercase text-[9px]'>Cliente</span>
              <span className='font-medium text-gray-700'>{order.cliente}</span>
            </div>
            <div className='flex flex-col'>
              <span className='font-black text-gray-400 uppercase text-[9px]'>Garzón</span>
              <span className='font-medium text-gray-700'>{order.garzon}</span>
            </div>
            <div className='flex flex-col'>
              <span className='font-black text-gray-400 uppercase text-[9px] text-green-600'>
                Total
              </span>
              <span className='font-bold text-green-700'>${formatNumberCL(order.total)}</span>
            </div>
          </div>

          {nicksArr.length > 0 && (
            <div className='mt-4 flex flex-wrap gap-1'>
              {nicksArr.map((nick, idx) => (
                <Badge
                  key={idx}
                  className={`text-[10px] uppercase font-black px-2 py-0.5 border-none ${
                    idx % 6 === 0
                      ? 'bg-blue-500 text-white'
                      : idx % 6 === 1
                        ? 'bg-emerald-500 text-white'
                        : idx % 6 === 2
                          ? 'bg-violet-500 text-white'
                          : idx % 6 === 3
                            ? 'bg-amber-500 text-white'
                            : idx % 6 === 4
                              ? 'bg-rose-500 text-white'
                              : 'bg-indigo-500 text-white'
                  }`}
                >
                  {nick.trim()}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {canDelete && (
          <div className='ml-4'>
            <Button
              size='sm'
              variant='ghost'
              className='rounded-full w-9 h-9 p-0 text-gray-300 hover:text-red-600 hover:bg-red-50 transition-all duration-300'
              onClick={e => onDeleteClick(e, order)}
            >
              <Trash2 className='w-4 h-4' />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
