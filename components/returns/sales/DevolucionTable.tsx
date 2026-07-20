import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Eye, User, Bed, DollarSign, CreditCard, Calendar } from 'lucide-react';
import { VentaWithDetails } from '@/types/venta';
import { formatCurrency, metodoPagoLabels } from '@/lib/business/salesUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';

interface DevolucionTableProps {
  ventas: VentaWithDetails[];
  loading: boolean;
  onVerDetalles: (venta: VentaWithDetails) => void;
}

export const DevolucionTable = ({ ventas, loading, onVerDetalles }: DevolucionTableProps) => {
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

  if (ventas.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 text-sm sm:text-base'>
        No se encontraron ventas anuladas
      </div>
    );
  }

  const renderMobileCardView = () => (
    <div className='space-y-4 lg:hidden'>
      {ventas.map(venta => (
        <Card key={venta.id} className='shadow-xs hover:shadow-md transition-shadow'>
          <CardContent className='p-4'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <h3 className='font-semibold text-lg text-gray-900'>{venta.codigo}</h3>
                <Badge variant='outline' className='text-xs'>
                  {metodoPagoLabels[venta.metodo_pago] || venta.metodo_pago}
                </Badge>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm'>
                <div className='flex items-center gap-2'>
                  <User className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Cliente:</span>
                  <span className='text-gray-700'>{venta.cliente_nombre || 'Sin cliente'}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <Bed className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Habitación:</span>
                  <span className='text-gray-700'>
                    {venta.habitacion_numero || 'Sin habitación'}
                  </span>
                </div>
                <div className='flex items-center gap-2'>
                  <DollarSign className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Total:</span>
                  <span className='text-gray-700 font-semibold'>{formatCurrency(venta.total)}</span>
                </div>
                <div className='flex items-center gap-2'>
                  <CreditCard className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Pago:</span>
                  <Badge variant='outline' className='text-xs'>
                    {metodoPagoLabels[venta.metodo_pago] || venta.metodo_pago}
                  </Badge>
                </div>
                <div className='flex items-center gap-2'>
                  <Calendar className='text-gray-500 w-4 h-4' />
                  <span className='font-medium'>Fecha:</span>
                  <span className='text-gray-700'>{formatLongDateEs(venta.fecha_crea)}</span>
                </div>
              </div>

              <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => onVerDetalles(venta)}
                        className='flex-1 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs'
                      >
                        <Eye className='w-3 h-3 mr-1' />
                        Ver Detalles
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ver detalles de la venta</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderDesktopTableView = () => (
    <div className='hidden lg:block'>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='text-sm'>Código</TableHead>
            <TableHead className='text-sm'>Cliente</TableHead>
            <TableHead className='text-sm'>Habitación</TableHead>
            <TableHead className='text-sm'>Total</TableHead>
            <TableHead className='text-sm'>Método Pago</TableHead>
            <TableHead className='text-sm'>Fecha</TableHead>
            <TableHead className='text-sm'>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ventas.map(venta => (
            <TableRow key={venta.id}>
              <TableCell className='font-medium text-sm'>{venta.codigo}</TableCell>
              <TableCell className='text-sm'>{venta.cliente_nombre || 'Sin cliente'}</TableCell>
              <TableCell className='text-sm'>
                {venta.habitacion_numero || 'Sin habitación'}
              </TableCell>
              <TableCell className='text-sm'>{formatCurrency(venta.total)}</TableCell>
              <TableCell>
                <Badge variant='outline' className='text-xs'>
                  {metodoPagoLabels[venta.metodo_pago] || venta.metodo_pago}
                </Badge>
              </TableCell>
              <TableCell className='text-sm'>{formatLongDateEs(venta.fecha_crea)}</TableCell>
              <TableCell>
                <div className='flex items-center gap-2'>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={() => onVerDetalles(venta)}
                          className='rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white'
                        >
                          <Eye className='w-4 h-4' />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Ver detalles de la venta</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
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
      {renderMobileCardView()}
      {renderDesktopTableView()}
    </>
  );
};
