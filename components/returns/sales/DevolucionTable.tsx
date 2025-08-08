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
import { Eye } from 'lucide-react';
import { VentaWithDetails } from '@/types/venta';
import { formatCurrency, metodoPagoLabels } from '@/lib/salesUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DevolucionTableProps {
  ventas: VentaWithDetails[];
  loading: boolean;
  onVerDetalles: (venta: VentaWithDetails) => void;
}

export const DevolucionTable = ({ ventas, loading, onVerDetalles }: DevolucionTableProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
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

  if (ventas.length === 0) {
    return <div className='text-center py-8 text-gray-500 text-sm sm:text-base'>No se encontraron ventas anuladas</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className='text-xs sm:text-sm'>Código</TableHead>
          <TableHead className='text-xs sm:text-sm'>Cliente</TableHead>
          <TableHead className='text-xs sm:text-sm'>Habitación</TableHead>
          <TableHead className='text-xs sm:text-sm'>Total</TableHead>
          <TableHead className='text-xs sm:text-sm'>Método Pago</TableHead>
          <TableHead className='text-xs sm:text-sm'>Fecha</TableHead>
          <TableHead className='text-xs sm:text-sm'>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ventas.map(venta => (
          <TableRow key={venta.id}>
            <TableCell className='font-medium text-xs sm:text-sm'>{venta.codigo}</TableCell>
            <TableCell className='text-xs sm:text-sm'>{venta.cliente_nombre || 'Sin cliente'}</TableCell>
            <TableCell className='text-xs sm:text-sm'>{venta.habitacion_numero || 'Sin habitación'}</TableCell>
            <TableCell className='text-xs sm:text-sm'>{formatCurrency(venta.total)}</TableCell>
            <TableCell>
              <Badge variant='outline' className='text-xs sm:text-sm'>
                {metodoPagoLabels[venta.metodo_pago] || venta.metodo_pago}
              </Badge>
            </TableCell>
            <TableCell className='text-xs sm:text-sm'>{formatDate(venta.fecha_crea)}</TableCell>
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
                        <Eye className='w-3 h-3 sm:w-4 sm:h-4' />
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
  );
};
