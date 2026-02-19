import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ShoppingCart, Beer, Eye, Ban, MoreVertical } from 'lucide-react';
import { VentaWithDetails } from '@/types/venta';
import { AnulacionModal } from './AnulacionModal';
import { useUserPermissions } from '@/hooks/auth/useUserPermissions';

interface SalesListProps {
  loading: boolean;
  paginatedVentas: VentaWithDetails[];
  searchTerm: string;
  filterStatus: string;
  filterMetodoPago: string;
  statusColors: Record<number, string>;
  statusLabels: Record<number, string>;
  metodoPagoLabels: Record<string, string>;
  anfitrionaColors: string[];
  formatCurrency: (value: number) => string;
  onVerDetalles: (ventaId: number) => void;
  onAnularVenta: (ventaId: number, motivo?: string) => void;
  page: number;
  setPage: (value: number) => void;
  totalPages: number;
}

export function SalesList({
  loading,
  paginatedVentas,
  searchTerm,
  filterStatus,
  filterMetodoPago,
  statusColors,
  statusLabels,
  metodoPagoLabels,
  anfitrionaColors,
  formatCurrency,
  onVerDetalles,
  onAnularVenta,
  page,
  setPage,
  totalPages
}: SalesListProps) {
  const [anulacionModal, setAnulacionModal] = useState<{
    open: boolean;
    ventaId: number | null;
    ventaInfo: any;
  }>({
    open: false,
    ventaId: null,
    ventaInfo: null
  });
  const hasFilters = searchTerm || filterStatus !== 'all' || filterMetodoPago !== 'all';
  
  const { hasPermission } = useUserPermissions();
  
  // Verificar permisos
  const canViewDetails = hasPermission('sales', 'view_details');
  const canAnular = hasPermission('sales', 'cancel');
  
  // Si no tiene ningún permiso de acción, no mostrar el menú
  const hasAnyAction = canViewDetails || canAnular;

  const handleAnularClick = (venta: VentaWithDetails) => {
    setAnulacionModal({
      open: true,
      ventaId: venta.id,
      ventaInfo: {
        codigo: venta.codigo,
        total: venta.total,
        cliente_nombre: venta.cliente_nombre
      }
    });
  };

  const handleConfirmarAnulacion = async (motivo: string) => {
    if (anulacionModal.ventaId) {
      await onAnularVenta(anulacionModal.ventaId, motivo);
      setAnulacionModal({ open: false, ventaId: null, ventaInfo: null });
    }
  };

  if (loading) {
    return (
      <Card className='shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg sm:text-xl'>Ventas Recientes</CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
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

  if (paginatedVentas.length === 0) {
    return (
      <Card className='shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg sm:text-xl'>Ventas Recientes</CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
          <div className='text-center py-8 sm:py-12'>
            <ShoppingCart className='h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4' />
            <h3 className='text-base sm:text-lg font-medium text-gray-900 mb-2'>
              {hasFilters ? 'No se encontraron ventas' : 'No hay ventas registradas'}
            </h3>
            <p className='text-sm sm:text-base text-gray-600'>
              {hasFilters
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Las ventas aparecerán aquí cuando se registren'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className='shadow-sm'>
        <CardHeader className='pb-4'>
          <CardTitle className='text-lg sm:text-xl'>Ventas Recientes</CardTitle>
        </CardHeader>
        <CardContent className='p-4 sm:p-6'>
          <div className='space-y-4'>
            <div className='space-y-3'>
              {Array.isArray(paginatedVentas) &&
                paginatedVentas.map((venta, index) => (
                  <div
                    key={venta?.id ? `venta-item-${venta.id}-${index}` : `venta-idx-${index}`}
                    className='flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 gap-4'
                  >
                    <div className='flex-1 min-w-0'>
                      <div className='flex flex-col sm:flex-row sm:items-center gap-2 mb-2'>
                        <h3 className='font-medium text-gray-900 text-sm sm:text-base truncate'>
                          {venta?.codigo || 'Sin código'}
                        </h3>
                        <div className='flex flex-wrap gap-1'>
                          <Badge
                            variant='secondary'
                            className={`${statusColors[venta?.estado !== null && venta?.estado !== undefined ? Number(venta.estado) : 1]} text-xs`}
                          >
                            {
                              statusLabels[
                                venta?.estado !== null && venta?.estado !== undefined
                                  ? Number(venta.estado)
                                  : 1
                              ]
                            }
                          </Badge>
                          <Badge variant='outline' className='text-xs'>
                            {
                              metodoPagoLabels[
                                (venta?.metodo_pago || 'efectivo') as keyof typeof metodoPagoLabels
                              ]
                            }
                          </Badge>
                        </div>
                      </div>
                      <div className='text-xs sm:text-sm text-gray-500 space-y-1'>
                        <p>Cliente: {venta.cliente_nombre || 'Sin cliente'}</p>
                        <p>
                          Habitación:{' '}
                          {venta.habitacion_nombre ||
                            venta.habitacion_numero ||
                            (venta as any).habitacion_nombre ||
                            'Sin habitación'}
                        </p>
                        <div className='flex flex-wrap gap-1 mt-1'>
                          <span className='text-xs'>Anfitriona(s):</span>
                          {Array.isArray(venta.usuarios) && venta.usuarios.length > 0 ? (
                            venta.usuarios.map((usuario: any, index: number) => (
                              <Badge
                                key={
                                  usuario.id
                                    ? `usuario-badge-${usuario.id}-${index}`
                                    : `user-idx-${index}`
                                }
                                className={`${
                                  anfitrionaColors[index % anfitrionaColors.length]
                                } text-xs`}
                              >
                                {usuario.nick || usuario.usuario_nombre || 'Sin nick'}
                              </Badge>
                            ))
                          ) : (
                            <Badge className='bg-gray-300 text-gray-900 text-xs'>
                              <Beer className='mr-1 w-3 h-3 sm:w-4 sm:h-4' />
                              Venta en barra
                            </Badge>
                          )}
                        </div>
                        <p>
                          Fecha:{' '}
                          {venta?.fecha_crea
                            ? new Date(venta.fecha_crea).toLocaleString('es-ES')
                            : 'Sin fecha'}
                        </p>
                        {venta?.fecha_mod && venta?.estado === 0 && (
                          <p className='text-gray-500'>
                            Fecha de anulación: {new Date(venta.fecha_mod).toLocaleString('es-ES')}
                          </p>
                        )}
                        {venta?.fecha_mod && venta?.estado === 2 && (
                          <p className='text-gray-500'>
                            Fecha de solicitud de anulación:{' '}
                            {new Date(venta.fecha_mod).toLocaleString('es-ES')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className='flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4'>
                      {/* Menú de acciones */}
                      {hasAnyAction && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant='ghost' size='sm' className='h-8 w-8 p-0 self-end'>
                              <MoreVertical className='w-3 h-3 sm:w-4 sm:h-4' />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align='end'>
                            <TooltipProvider>
                              {canViewDetails && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      onClick={() => onVerDetalles(venta?.id)}
                                      className='hover:text-blue-600 group'
                                    >
                                      <Eye className='group-hover:text-blue-600 w-3 h-3 sm:w-4 sm:h-4' />
                                      <span className='ml-2 group-hover:text-blue-600'>
                                        Ver detalles
                                      </span>
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Ver detalles completos de la venta</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                              {Number(venta?.estado) !== 0 && canAnular && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuItem
                                      onClick={() => handleAnularClick(venta)}
                                      className='hover:text-red-600 group'
                                    >
                                      <Ban className='group-hover:text-red-600 w-3 h-3 sm:w-4 sm:h-4' />
                                      <span className='ml-2 group-hover:text-red-600'>Anular</span>
                                    </DropdownMenuItem>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Anular esta venta</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </TooltipProvider>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <div className='text-right'>
                        <div className='font-medium text-gray-900 text-sm sm:text-base'>
                          {formatCurrency(venta?.total || 0)}
                        </div>
                        <div className='text-xs sm:text-sm text-gray-500'>
                          {Array.isArray(venta.detalles) ? venta.detalles.length : 0} productos
                        </div>
                        {(venta?.propina || 0) > 0 && (
                          <div className='text-xs text-green-600'>
                            +{formatCurrency(venta?.propina || 0)} propina
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AnulacionModal
        open={anulacionModal.open}
        onOpenChange={open => setAnulacionModal(prev => ({ ...prev, open }))}
        onConfirm={handleConfirmarAnulacion}
        ventaInfo={anulacionModal.ventaInfo}
      />
    </>
  );
}
