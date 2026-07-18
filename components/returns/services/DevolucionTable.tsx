/* eslint-disable */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, X, User, Bed, Clock, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { ServicioWithDetails } from '@/types/servicio';
import { formatCurrency, metodoPagoLabels } from '@/lib/business/salesUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

interface DevolucionTableProps {
  servicios: ServicioWithDetails[];
  loading: boolean;
  showAnularButton?: boolean;
  onVerDetalles: (servicio: ServicioWithDetails) => void;
  onAnularServicio: (servicio: ServicioWithDetails) => void;
}

export const DevolucionTable = ({
  servicios,
  loading,
  showAnularButton = true,
  onVerDetalles,
  onAnularServicio
}: DevolucionTableProps) => {
  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return (
          <Badge variant='default' className='bg-green-600 text-xs sm:text-sm'>
            Activo
          </Badge>
        );
      case 2:
        return (
          <Badge variant='secondary' className='bg-yellow-600 text-xs sm:text-sm'>
            Pendiente
          </Badge>
        );
      case 3:
        return (
          <Badge variant='destructive' className='text-xs sm:text-sm'>
            Devuelto
          </Badge>
        );
      default:
        return (
          <Badge variant='outline' className='text-xs sm:text-sm'>
            Desconocido
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className='space-y-4'>
        {[...Array(5)].map((_, i) => (
          <div key={i} className='flex items-center space-x-4'>
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='h-4 w-[200px]' />
            <Skeleton className='h-4 w-[100px]' />
            <Skeleton className='h-4 w-[100px]' />
          </div>
        ))}
      </div>
    );
  }

  if (servicios.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 text-sm sm:text-base'>
        No se encontraron servicios activos
      </div>
    );
  }

  const MobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {servicios.map(servicio => (
        <Card key={servicio.id_servicio} className='shadow-xs hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              {}
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg text-gray-900'>{servicio.codigo}</h3>
                {getEstadoBadge(servicio.estado)}
              </div>

              {}
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Cliente:</span>
                  <span className='text-gray-700'>{servicio.cliente_nombre || 'Sin cliente'}</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Bed className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Habitación:</span>
                  <span className='text-gray-700'>
                    {servicio.habitacion_numero || 'Sin habitación'}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <Clock className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Tiempo:</span>
                  <span className='text-gray-700'>{servicio.tiempo} min</span>
                </div>

                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Total:</span>
                  <span className='text-gray-700 font-semibold'>
                    {formatCurrency(servicio.total)}
                  </span>
                </div>

                <div className='flex items-center gap-2'>
                  <CreditCard className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Pago:</span>
                  <Badge variant='outline' className='text-xs'>
                    {servicio.metodo_pago
                      ? metodoPagoLabels[servicio.metodo_pago as keyof typeof metodoPagoLabels] ||
                        servicio.metodo_pago
                      : 'Sin método'}
                  </Badge>
                </div>

                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Fecha:</span>
                  <span className='text-gray-700'>{formatLongDateEs(servicio.fecha_crea)}</span>
                </div>
              </div>

              {}
              <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => onVerDetalles(servicio)}
                        className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs'
                      >
                        <Eye className='w-3 h-3 mr-1' />
                        Ver Detalles
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver detalles del servicio</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {showAnularButton && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onAnularServicio(servicio)}
                          className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-red-600 hover:text-white text-xs'
                        >
                          <X className='w-3 h-3 mr-1' />
                          Anular
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Anular servicio</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-sm'>Código</TableHead>
            <TableHead className='text-sm'>Cliente</TableHead>
            <TableHead className='text-sm'>Habitación</TableHead>
            <TableHead className='text-sm'>Tiempo</TableHead>
            <TableHead className='text-sm'>Total</TableHead>
            <TableHead className='text-sm'>Método Pago</TableHead>
            <TableHead className='text-sm'>Estado</TableHead>
            <TableHead className='text-sm'>Fecha</TableHead>
            <TableHead className='text-sm'>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {servicios.map(servicio => (
            <TableRow key={servicio.id_servicio}>
              <TableCell className='font-medium text-sm'>{servicio.codigo}</TableCell>
              <TableCell className='text-sm'>{servicio.cliente_nombre || 'Sin cliente'}</TableCell>
              <TableCell className='text-sm'>
                {servicio.habitacion_numero || 'Sin habitación'}
              </TableCell>
              <TableCell className='text-sm'>{servicio.tiempo} min</TableCell>
              <TableCell className='text-sm'>{formatCurrency(servicio.total)}</TableCell>
              <TableCell>
                <Badge variant='outline' className='text-xs'>
                  {servicio.metodo_pago
                    ? metodoPagoLabels[servicio.metodo_pago as keyof typeof metodoPagoLabels] ||
                      servicio.metodo_pago
                    : 'Sin método'}
                </Badge>
              </TableCell>
              <TableCell>{getEstadoBadge(servicio.estado)}</TableCell>
              <TableCell className='text-sm'>{formatLongDateEs(servicio.fecha_crea)}</TableCell>
              <TableCell>
                <div className='flex items-center gap-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onVerDetalles(servicio)}
                          className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
                        >
                          <Eye className='w-4 h-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver detalles del servicio</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {showAnularButton && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={() => onAnularServicio(servicio)}
                            className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-red-600 hover:text-white'
                          >
                            <X className='w-4 h-4' />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Anular servicio</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />
    </>
  );
};
