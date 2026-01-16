import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CajaWithUser } from "@/types/caja";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import {
  Lock,
  DollarSign,
  Calendar,
  TrendingDown,
  TrendingUp,
  ArrowDownCircle,
  Loader2,
  ShoppingCart,
  Home,
} from "lucide-react";
import { useRetiros } from "@/hooks/useRetiros";
import { useEffect, useState } from "react";

// Función para obtener el día de la semana en español
const getDiaSemana = (fecha: string): string => {
  const dias = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const fechaObj = new Date(fecha);
  return dias[fechaObj.getDay()];
};

interface CajaDetailsProps {
  caja: CajaWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getEstadoInfo = (estado: number) => {
  switch (estado) {
    case 1:
      return {
        label: "Abierta",
        color: "bg-green-100 text-green-800",
        icon: DollarSign,
      };
    case 0:
      return {
        label: "Cerrada",
        color: "bg-red-100 text-red-800",
        icon: Lock,
      };
    default:
      return {
        label: "Eliminada",
        color: "bg-gray-100 text-gray-800",
        icon: Lock,
      };
  }
};

export const CajaDetails = ({ caja, open, onOpenChange }: CajaDetailsProps) => {
  const { retiros, loading: retirosLoading } = useRetiros(caja?.id_caja || null);
  const [ventas, setVentas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);

  useEffect(() => {
    if (open && caja) {
      // Cargar ventas
      setLoadingVentas(true);
      fetch(`/api/sales?caja_id=${caja.id_caja}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setVentas(data.data || []);
          }
        })
        .catch(err => console.error('Error cargando ventas:', err))
        .finally(() => setLoadingVentas(false));

      // Cargar servicios
      setLoadingServicios(true);
      fetch(`/api/servicios?caja_id=${caja.id_caja}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setServicios(data.data || []);
          }
        })
        .catch(err => console.error('Error cargando servicios:', err))
        .finally(() => setLoadingServicios(false));
    }
  }, [open, caja]);

  if (!caja) return null;

  const estadoInfo = getEstadoInfo(caja.estado);

  const totalIngresos = caja.efectivo + caja.tarjeta + caja.transferencia;
  const balanceActual = caja.monto_apertura + totalIngresos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-0 w-[95vw]">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>
              Detalles de Caja {getDiaSemana(caja.fecha_apertura)}{" "}
              <Badge variant="secondary" className={estadoInfo.color}>
                {estadoInfo.label}
              </Badge>
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Abierta por:</span>
                  <span className="font-medium">
                    {caja.cajero_nombre || "N/A"}
                  </span>
                </div>

                {caja.cajero_cierre_nombre && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Cerrada por:</span>
                    <span className="font-medium">
                      {caja.cajero_cierre_nombre}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar />
                <span className="text-gray-500">Fecha de apertura:</span>
                <span className="font-medium">
                  {new Date(caja.fecha_apertura).toLocaleDateString("es-ES", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              {caja.fecha_cierre && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar />
                  <span className="text-gray-500">Fecha de cierre:</span>
                  <span className="font-medium">
                    {new Date(caja.fecha_cierre).toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Resumen financiero */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h5 className="font-medium text-lg mb-4 text-center">
              Resumen Financiero
            </h5>
            <div className="flex justify-center gap-2 text-sm">
              <span className="text-gray-600">Monto apertura:</span>
              <span className="font-medium">
                {formatCurrencyNoDecimals(caja.monto_apertura)}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {/* Ingresos */}
              <div className="space-y-3">
                <span className="font-xs text-green-600 flex items-center gap-2">
                  <TrendingUp />
                  Ingresos
                </span>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto en Ventas:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrencyNoDecimals(caja.ventas)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto en Servicios:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrencyNoDecimals(caja.servicios)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto en Propinas:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrencyNoDecimals(caja.propina || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gastos y balance */}
              <div className="space-y-3">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <TrendingDown />
                  Egresos
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto en Devoluciones:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyNoDecimals(caja.devoluciones)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monto en Anticipo:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyNoDecimals(caja.anticipo || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t pt-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto en Efectivo:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(
                    caja.efectivo + caja.monto_apertura
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto en Tarjeta:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.tarjeta)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto en Transferencia:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.transferencia)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto en IVA:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.iva || 0)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Monto en Comisiones:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.comision || 0)}
                </span>
              </div>
            </div>
            <div className="border-t pt-2 mt-5">
              <div className="flex justify-between font-bold text-lg">
                <span>Balance Final:</span>
                <span
                  className={
                    balanceActual >= 0 ? "text-green-600" : "text-red-600"
                  }
                >
                  {formatCurrencyNoDecimals(balanceActual)}
                </span>
              </div>
            </div>
          </div>

          {/* Historial de Retiros */}
          <div className='bg-gray-50 p-4 rounded-lg'>
            <h5 className='font-medium text-lg mb-4 flex items-center gap-2'>
              <ArrowDownCircle className='w-5 h-5 text-orange-600' />
              Historial de Retiros
            </h5>

            {retirosLoading ? (
              <div className='flex justify-center items-center py-8'>
                <Loader2 className='h-6 w-6 animate-spin text-gray-400' />
              </div>
            ) : retiros.length === 0 ? (
              <div className='text-center py-8 text-gray-500 text-sm'>
                No hay retiros registrados para esta caja
              </div>
            ) : (
              <div className='space-y-3'>
                {retiros.map((retiro) => (
                  <div
                    key={retiro.id_retiro}
                    className='bg-white p-3 rounded-lg border border-gray-200'
                  >
                    <div className='flex justify-between items-start mb-2'>
                      <div className='flex-1'>
                        <div className='flex items-center gap-2 mb-1'>
                          <span className='font-medium text-orange-600'>
                            -${Math.round(retiro.monto).toLocaleString()}
                          </span>
                          <span className='text-xs text-gray-500'>
                            por {retiro.usuario_nombre || 'Usuario desconocido'}
                          </span>
                        </div>
                        <p className='text-sm text-gray-600'>{retiro.motivo}</p>
                      </div>
                      <span className='text-xs text-gray-400 whitespace-nowrap ml-2'>
                        {new Date(retiro.fecha_retiro).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))}
                {retiros.length > 0 && (
                  <div className='border-t pt-3 mt-3'>
                    <div className='flex justify-between text-sm font-medium'>
                      <span>Total Retirado:</span>
                      <span className='text-orange-600'>
                        -${Math.round(retiros.reduce((sum, r) => sum + r.monto, 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Listado de Ventas */}
          <div className="border-t pt-4">
            <h5 className="font-medium text-lg mb-4 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Ventas Realizadas ({ventas.length})
            </h5>
            {loadingVentas ? (
              <div className="text-center py-4 text-gray-500">Cargando ventas...</div>
            ) : ventas.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">CÓDIGO</TableHead>
                      <TableHead className="text-xs sm:text-sm">CLIENTE</TableHead>
                      <TableHead className="text-xs sm:text-sm">FECHA</TableHead>
                      <TableHead className="text-xs sm:text-sm">MÉTODO PAGO</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ventas.map((venta: any) => (
                      <TableRow key={venta.id_venta}>
                        <TableCell className="text-xs sm:text-sm font-mono">{venta.codigo}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{venta.cliente_nombre || 'Sin cliente'}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(venta.fecha_crea).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm capitalize">{venta.metodo_pago}</TableCell>
                        <TableCell className="text-right text-xs sm:text-sm font-semibold">
                          {formatCurrencyNoDecimals(venta.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No hay ventas registradas</div>
            )}
          </div>

          {/* Listado de Servicios */}
          <div className="border-t pt-4">
            <h5 className="font-medium text-lg mb-4 flex items-center gap-2">
              <Home className="w-5 h-5" />
              Servicios Realizados ({servicios.length})
            </h5>
            {loadingServicios ? (
              <div className="text-center py-4 text-gray-500">Cargando servicios...</div>
            ) : servicios.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs sm:text-sm">CÓDIGO</TableHead>
                      <TableHead className="text-xs sm:text-sm">CLIENTE</TableHead>
                      <TableHead className="text-xs sm:text-sm">HABITACIÓN</TableHead>
                      <TableHead className="text-xs sm:text-sm">FECHA</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm">TOTAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {servicios.map((servicio: any) => (
                      <TableRow key={servicio.id_servicio}>
                        <TableCell className="text-xs sm:text-sm font-mono">{servicio.codigo}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{servicio.cliente_nombre || 'Sin cliente'}</TableCell>
                        <TableCell className="text-xs sm:text-sm">{servicio.habitacion_nombre || 'N/A'}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {new Date(servicio.fecha_crea).toLocaleDateString('es-ES')}
                        </TableCell>
                        <TableCell className="text-right text-xs sm:text-sm font-semibold">
                          {formatCurrencyNoDecimals(servicio.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">No hay servicios registrados</div>
            )}
          </div>
          </div>
        </div>

        {/* Footer con botón - fijo en la parte inferior */}
        <div className="flex-shrink-0 border-t px-4 sm:px-6 py-4 bg-white">
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-6 bg-black text-white hover:scale-105 transition-all duration-200"
              onClick={() => onOpenChange(false)}
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
