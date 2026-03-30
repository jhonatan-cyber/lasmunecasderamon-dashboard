import React from 'react';
import { ArrowDownCircle, ShoppingCart, Home, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Paginate from '@/components/shared/Paginate';
import { 
  formatCurrencyCLP, 
  formatCurrencyNoDecimals, 
  formatFechaLarga, 
  formatSoloHora 
} from '@/lib/utils/formatters';

interface CajaOperationsTablesProps {
  // Retiros
  retirosLoading: boolean;
  retiros: any[];
  // Ventas
  loadingVentas: boolean;
  ventas: any[];
  ventasPage: number;
  totalVentasPages: number;
  onVentasPageChange: (page: number) => void;
  // Servicios
  loadingServicios: boolean;
  servicios: any[];
  serviciosPage: number;
  totalServiciosPages: number;
  onServiciosPageChange: (page: number) => void;
}

export function CajaOperationsTables({
  retirosLoading,
  retiros,
  loadingVentas,
  ventas,
  ventasPage,
  totalVentasPages,
  onVentasPageChange,
  loadingServicios,
  servicios,
  serviciosPage,
  totalServiciosPages,
  onServiciosPageChange
}: CajaOperationsTablesProps) {
  return (
    <div className="px-6 space-y-12 pb-12">
      {/* Historial de Retiros */}
      <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-[2rem] border border-gray-100 dark:border-gray-800">
        <h5 className="font-medium text-lg mb-6 text-gray-900 dark:text-white flex items-center gap-2">
          <ArrowDownCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          Historial de Retiros
        </h5>

        {retirosLoading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : retiros.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No hay retiros registrados para esta caja
          </div>
        ) : (
          <div className="space-y-3">
            {retiros.map((retiro, index) => (
              <div key={index} className="flex justify-between items-center p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                    <ArrowDownCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-gray-100">{retiro.motivo || 'Motivo no especificado'}</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-widest font-black">
                      {formatFechaLarga(retiro.fecha_retiro)} • {formatSoloHora(retiro.fecha_retiro)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-600 dark:text-orange-400 text-lg">
                    -{formatCurrencyCLP(retiro.monto)}
                  </p>
                  <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Retirado por: {retiro.cajero_nombre || 'N/A'}</p>
                </div>
              </div>
            ))}
            {retiros.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3">
                <div className="flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span>Total Retirado:</span>
                  <span className="text-orange-600 dark:text-orange-400">
                    {formatCurrencyCLP(retiros.reduce((sum, r) => sum + r.monto, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Listado de Ventas */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h5 className="font-medium text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400" />
          Ventas Realizadas ({ventas.length})
        </h5>

        {loadingVentas ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : ventas.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No hay ventas registradas para esta caja
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">CLIENTE</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">HABITACIÓN</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">CATEGORÍA</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">CANTIDAD</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">PRECIO</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">PROPINA</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">FECHA</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">MÉTODO PAGO</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-bold whitespace-nowrap">TOTAL VENTAS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ventas.map((venta, index) => (
                    <TableRow key={index} className="border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-gray-900 transition-colors">
                      <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {venta.cliente_nombre || 'Cliente General'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge variant="outline" className="text-[10px] font-bold dark:border-gray-700">
                          {venta.habitacion_nombre || 'Barra'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm capitalize dark:text-gray-300">
                        {venta.categoria?.toLowerCase()}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-bold dark:text-gray-200">
                        {venta.cantidad}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {formatCurrencyNoDecimals(venta.precio_unitario)}
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm text-orange-600 font-medium">
                        {formatCurrencyNoDecimals(venta.propina)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        {formatSoloHora(venta.fecha_venta)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm capitalize">
                        <Badge variant="secondary" className="text-[10px] py-0 dark:bg-gray-700 dark:text-gray-200">
                          {venta.metodo_pago || 'efectivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-black text-gray-900 dark:text-gray-100">
                        {formatCurrencyNoDecimals(venta.total_venta)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Paginate
              page={ventasPage}
              totalPages={totalVentasPages}
              setPage={onVentasPageChange}
            />
          </div>
        )}
      </div>

      {/* Servicios Realizados */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
        <h5 className="font-medium text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          <Home className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          Servicios Realizados ({servicios.length})
        </h5>

        {loadingServicios ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" />
          </div>
        ) : servicios.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
            No hay servicios registrados para esta caja
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-200 dark:border-gray-700">
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">CLIENTE</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">ANFITRIONAS</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">USUARIO</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">HABITACIÓN</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">PRECIO SERVICIO</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">PRECIO HABITACIÓN</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">IVA</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">FECHA</TableHead>
                    <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">MÉTODO PAGO</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">TOTAL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {servicios.map((servicio, index) => (
                    <TableRow key={index} className="border-gray-100 dark:border-gray-800 hover:bg-white/50 dark:hover:bg-gray-900 transition-colors">
                      <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                        {servicio.cliente_nombre || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 italic">
                        {servicio.anfitrionas_nombres || "Sin asignar"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {servicio.usuario_nombre || "Admin"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge variant="outline" className="text-[10px] font-bold dark:border-gray-700">
                          {servicio.habitacion_nombre || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        <div className="flex flex-col items-end gap-1">
                          <span>{formatCurrencyNoDecimals(servicio.monto || 0)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {servicio.anfitrionas_nombres ? `para anfitrionas (${servicio.anfitrionas_nombres.split(',').length})` : 'total'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
                        <div className="flex flex-col items-end gap-1">
                          <span>{formatCurrencyNoDecimals(servicio.precio_habitacion || 0)}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {servicio.anfitrionas_nombres ? `por anfitriona (${servicio.anfitrionas_nombres.split(',').length})` : 'total'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatCurrencyNoDecimals(servicio.iva || 0)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                        <div className="flex flex-col">
                          <span>{formatFechaLarga(servicio.fecha_crea)}</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {formatSoloHora(servicio.fecha_crea)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm capitalize">
                        <Badge variant="secondary" className="text-xs px-2 py-0.5 dark:bg-gray-700 dark:text-gray-200">
                          {servicio.metodo_pago || 'efectivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs sm:text-sm font-bold text-gray-900 dark:text-gray-100">
                        {formatCurrencyNoDecimals(servicio.total || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <Paginate
              page={serviciosPage}
              totalPages={totalServiciosPages}
              setPage={onServiciosPageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
