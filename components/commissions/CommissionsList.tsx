/* eslint-disable */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import { Commission } from '@/types/commission';
import { DollarSign, User, Tag, ShoppingCart, Server, Coins, Eye } from 'lucide-react';
import Paginate from '@/components/ui/paginate';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

interface CommissionsListProps {
  loading: boolean;
  paginatedCommissions: Commission[];
  getStatusColor: (status: string) => string;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
  onViewDetails: (commission: Commission) => void;
}

export function CommissionsList({
  loading,
  paginatedCommissions,
  getStatusColor,
  page,
  setPage,
  totalPages,
  onViewDetails
}: CommissionsListProps) {
  const { hasPermission } = useUserPermissions();
  
  // Verificar permiso para ver detalles
  const canViewDetail = hasPermission('commissions', 'view_details');
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-lg sm:text-xl'>Comisiones Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-4'>
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className='flex items-center justify-between p-4 border border-gray-100 rounded-lg'
              >
                <Skeleton className='h-4 w-32' />
                <Skeleton className='h-4 w-24' />
                <Skeleton className='h-4 w-20' />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paginatedCommissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-lg sm:text-xl'>Comisiones Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8 sm:py-12'>
            <DollarSign className='h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-base sm:text-lg font-medium text-gray-900 mb-2'>
              No se encontraron comisiones
            </h3>
            <p className='text-sm sm:text-base text-gray-600'>
              Intenta ajustar los filtros de búsqueda
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista de tarjetas para móviles
  const MobileCardView = () => (
    <div className='lg:hidden space-y-3'>
      {paginatedCommissions.map(commission => (
        <Card key={commission.id} className='p-4 sm:p-6'>
          <CardContent className='space-y-3'>
            {/* Header con empleado y estado */}
            <div className='flex justify-between items-start'>
              <div className='flex items-center gap-2'>
                <User className='h-4 w-4 text-blue-500' />
                <span className='font-bold text-sm sm:text-base'>{commission.nick}</span>
              </div>
              <Badge className={`${getStatusColor(commission.status)} text-xs sm:text-sm`}>
                {commission.status === 'por_pagar'
                  ? 'Por pagar'
                  : commission.status === 'pagado'
                    ? 'Pagado'
                    : 'Anulado'}
              </Badge>
            </div>

            {/* Información de la comisión */}
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <Tag className='h-3 w-3 text-gray-400' />
                <span className='text-xs sm:text-sm text-gray-600'>
                  Anfitriona: {commission.employeeName}
                </span>
              </div>

              <div className='flex items-center gap-2'>
                <ShoppingCart className='h-3 w-3 text-gray-400' />
                <span className='text-xs sm:text-sm text-gray-600'>
                  Venta: {formatCurrencyNoDecimals(commission.venta)}
                </span>
              </div>

              <div className='flex items-center gap-2'>
                <Server className='h-3 w-3 text-gray-400' />
                <span className='text-xs sm:text-sm text-gray-600'>
                  Servicio: {formatCurrencyNoDecimals(commission.servicio)}
                </span>
              </div>

              <div className='flex items-center gap-2 pt-2 border-t border-gray-200'>
                <Coins className='h-3 w-3 text-green-500' />
                <span className='text-sm sm:text-base font-semibold text-green-600'>
                  Total: {formatCurrencyNoDecimals(commission.total)}
                </span>
              </div>
            </div>

            {/* Botón de ver detalles */}
            {canViewDetail && (
              <div className='pt-3 border-t border-gray-200'>
                <Button
                  onClick={() => onViewDetails(commission)}
                  size='sm'
                  variant='outline'
                  className='w-full rounded-full text-xs sm:text-sm hover:bg-blue-50 hover:border-blue-200 group'
                >
                  <Eye className='h-3 w-3 mr-2 group-hover:text-blue-600' />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Vista de tabla para desktop
  const DesktopTableView = () => (
    <div className='hidden lg:block'>
      <Card>
        <CardHeader>
          <CardTitle className='text-lg sm:text-xl'>Comisiones Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table className='w-full justify-center text-center'>
            <TableHeader>
              <TableRow>
                <TableHead className='text-start text-sm sm:text-base'>Nick / Anfitriona</TableHead>
                <TableHead className='text-center text-sm sm:text-base'>Venta</TableHead>
                <TableHead className='text-center text-sm sm:text-base'>Servicio</TableHead>
                <TableHead className='text-center text-sm sm:text-base'>Total</TableHead>
                <TableHead className='text-center text-sm sm:text-base'>Estado</TableHead>
                {canViewDetail && (
                  <TableHead className='text-center text-sm sm:text-base'>Acciones</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedCommissions.map(commission => (
                <TableRow key={commission.id}>
                  <TableCell>
                    <div className='text-start'>
                      <div className='font-bold text-sm sm:text-base text-blue-600'>
                        {commission.nick}
                      </div>
                      <div className='text-[10px] text-gray-400'>{commission.employeeName}</div>
                    </div>
                  </TableCell>
                  <TableCell className='font-semibold text-sm sm:text-base'>
                    {formatCurrencyNoDecimals(commission.venta)}
                  </TableCell>
                  <TableCell className='font-semibold text-sm sm:text-base'>
                    {formatCurrencyNoDecimals(commission.servicio)}
                  </TableCell>
                  <TableCell className='font-semibold text-sm sm:text-base'>
                    {formatCurrencyNoDecimals(commission.total)}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(commission.status)} text-xs sm:text-sm`}>
                      {commission.status === 'por_pagar'
                        ? 'Por pagar'
                        : commission.status === 'pagado'
                          ? 'Pagado'
                          : 'Anulado'}
                    </Badge>
                  </TableCell>
                  {canViewDetail && (
                    <TableCell className='text-center'>
                      <Button
                        onClick={() => onViewDetails(commission)}
                        size='sm'
                        variant='outline'
                        className='rounded-full text-xs sm:text-sm hover:bg-blue-50 hover:border-blue-200 group'
                      >
                        <Eye className='h-3 w-3 mr-1 group-hover:text-blue-600' />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <>
      <MobileCardView />
      <DesktopTableView />

      {/* Paginador */}
      {totalPages > 1 && (
        <div className='flex justify-center mt-4 sm:mt-6'>
          <Paginate page={page} totalPages={totalPages} setPage={setPage} />
        </div>
      )}
    </>
  );
}

