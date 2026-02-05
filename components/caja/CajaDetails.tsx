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
import Paginate from "@/components/ui/paginate";

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
  const { retiros, loading: retirosLoading, refetch: refetchRetiros } = useRetiros(caja?.id_caja || null);
  const [ventas, setVentas] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [comisionesSinChampagne, setComisionesSinChampagne] = useState(0);
  const [ventasChampagne, setVentasChampagne] = useState<{
    total_venta: number;
    monto_champagne: number;
    comisiones: number;
    propinas: number;
  }>({ total_venta: 0, monto_champagne: 0, comisiones: 0, propinas: 0 });
  const [ventasBarras, setVentasBarras] = useState<{
    total_venta: number;
    monto_productos: number;
    propinas: number;
  }>({ total_venta: 0, monto_productos: 0, propinas: 0 });
  const [ventasTragosChicas, setVentasTragosChicas] = useState<{
    total_venta: number;
    monto_productos: number;
    comisiones: number;
    propinas: number;
  }>({ total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 });
  const [serviciosDesglose, setServiciosDesglose] = useState<{
    total_iva: number;
    total_habitacion: number;
    total_servicio_neto: number;
  }>({ total_iva: 0, total_habitacion: 0, total_servicio_neto: 0 });
  const [loadingVentas, setLoadingVentas] = useState(false);
  const [loadingServicios, setLoadingServicios] = useState(false);
  const [loadingComisiones, setLoadingComisiones] = useState(false);
  const [loadingChampagne, setLoadingChampagne] = useState(false);
  const [loadingBarras, setLoadingBarras] = useState(false);
  const [loadingTragosChicas, setLoadingTragosChicas] = useState(false);

  // Estados de paginación
  const [ventasPage, setVentasPage] = useState(1);
  const [serviciosPage, setServiciosPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    if (open && caja) {

      setVentasPage(1);
      setServiciosPage(1);

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

            // Calcular desglose de servicios
            const serviciosData = data.data || [];
            const totalIva = serviciosData.reduce((sum: number, s: any) => sum + (s.iva || 0), 0);
            const totalHabitacion = serviciosData.reduce((sum: number, s: any) => sum + (s.precio_habitacion || 0), 0);
            const totalServicioNeto = serviciosData.reduce((sum: number, s: any) => sum + (s.precio_servicio || 0), 0);

            setServiciosDesglose({
              total_iva: totalIva,
              total_habitacion: totalHabitacion,
              total_servicio_neto: totalServicioNeto
            });
          }
        })
        .catch(err => console.error('Error cargando servicios:', err))
        .finally(() => setLoadingServicios(false));

      // Cargar comisiones de ventas sin champagne
      setLoadingComisiones(true);
      fetch(`/api/caja/comisiones-sin-champagne?caja_id=${caja.id_caja}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setComisionesSinChampagne(Number(data.total || 0));
          }
        })
        .catch(err => console.error('Error cargando comisiones:', err))
        .finally(() => setLoadingComisiones(false));

      // Cargar ventas de champaña
      setLoadingChampagne(true);
      fetch(`/api/caja/ventas-champagne?caja_id=${caja.id_caja}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setVentasChampagne({
              total_venta: Number(data.total_venta || 0),
              monto_champagne: Number(data.monto_champagne || 0),
              comisiones: Number(data.comisiones || 0),
              propinas: Number(data.propinas || 0)
            });
          }
        })
        .catch(err => console.error('Error cargando ventas champagne:', err))
        .finally(() => setLoadingChampagne(false));

      // Cargar ventas en barras (sin comisión)
      setLoadingBarras(true);
      fetch(`/api/caja/ventas-barras?caja_id=${caja.id_caja}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setVentasBarras({
              total_venta: Number(data.total_venta || 0),
              monto_productos: Number(data.monto_productos || 0),
              propinas: Number(data.propinas || 0)
            });
          } else {
            console.warn('API devolvió success: false para ventas barras');
            setVentasBarras({ total_venta: 0, monto_productos: 0, propinas: 0 });
          }
        })
        .catch(err => {
          console.error('Error cargando ventas barras:', err);
          // Establecer valores por defecto en caso de error
          setVentasBarras({ total_venta: 0, monto_productos: 0, propinas: 0 });
        })
        .finally(() => setLoadingBarras(false));

      // Cargar ventas tragos chicas (con comisión, sin champagne)
      setLoadingTragosChicas(true);
      fetch(`/api/caja/ventas-tragos-chicas?caja_id=${caja.id_caja}`)
        .then(res => {
          if (!res.ok) {
            // Si la API no está disponible (404), usar datos de fallback
            if (res.status === 404) {
              console.warn('API ventas-tragos-chicas no disponible, usando fallback');
              return { success: true, total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 };
            }
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setVentasTragosChicas({
              total_venta: Number(data.total_venta || 0),
              monto_productos: Number(data.monto_productos || 0),
              comisiones: Number(data.comisiones || 0),
              propinas: Number(data.propinas || 0)
            });
          } else {
            console.warn('API devolvió success: false para ventas tragos chicas');
            setVentasTragosChicas({ total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 });
          }
        })
        .catch(err => {
          console.error('Error cargando ventas tragos chicas:', err);
          // En caso de error, usar valores por defecto
          setVentasTragosChicas({ total_venta: 0, monto_productos: 0, comisiones: 0, propinas: 0 });
        })
        .finally(() => setLoadingTragosChicas(false));
    }
  }, [open, caja]);

  // Efecto adicional para actualizar cuando cambien los valores de la caja
  useEffect(() => {
    if (open && caja) {
      // Recargar datos cuando cambien valores importantes de la caja
      const timeoutId = setTimeout(() => {
        // Refrescar retiros cuando cambie el efectivo (indica nuevo retiro)
        refetchRetiros();
        
        // Recargar ventas
        setLoadingVentas(true);
        fetch(`/api/sales?caja_id=${caja.id_caja}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setVentas(data.data || []);
            }
          })
          .catch(err => console.error('Error recargando ventas:', err))
          .finally(() => setLoadingVentas(false));

        // Recargar servicios
        setLoadingServicios(true);
        fetch(`/api/servicios?caja_id=${caja.id_caja}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setServicios(data.data || []);
            }
          })
          .catch(err => console.error('Error recargando servicios:', err))
          .finally(() => setLoadingServicios(false));
      }, 100); // Pequeño delay para evitar múltiples llamadas

      return () => clearTimeout(timeoutId);
    }
  }, [caja?.efectivo, caja?.monto_apertura, caja?.devoluciones, caja?.anticipo, open, refetchRetiros]);

  // Funciones de paginación
  const getPaginatedVentas = () => {
    const startIndex = (ventasPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return ventas.slice(startIndex, endIndex);
  };

  const getPaginatedServicios = () => {
    const startIndex = (serviciosPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return servicios.slice(startIndex, endIndex);
  };

  const getTotalVentasPages = () => Math.ceil(ventas.length / itemsPerPage);
  const getTotalServiciosPages = () => Math.ceil(servicios.length / itemsPerPage);

  const handleVentasPageChange = (page: number) => {
    setVentasPage(page);
  };

  const handleServiciosPageChange = (page: number) => {
    setServiciosPage(page);
  };

  if (!caja) return null;

  const estadoInfo = getEstadoInfo(caja.estado);

  const totalPropinas = Number(ventasTragosChicas.propinas || 0) + Number(ventasChampagne.propinas || 0) + Number(ventasBarras.propinas || 0);
  const totalIngresos = Number(ventasTragosChicas.total_venta || 0) + Number(caja.servicios || 0) + Number(ventasChampagne.total_venta || 0) + Number(ventasBarras.total_venta || 0);
  const totalEgresos = Number(caja.devoluciones || 0) + Number(caja.anticipo || 0) + retiros.reduce((sum, r) => sum + Number(r.monto || 0), 0);
  const balanceActual = Number(caja.monto_apertura || 0) + totalIngresos - totalEgresos;

  // Efectivo real en caja (apertura + efectivo actual que ya tiene los retiros descontados)
  const efectivoRealEnCaja = Number(caja.monto_apertura || 0) + Number(caja.efectivo || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[98vh] flex flex-col p-0 w-[95vw]">
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
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h5 className="font-medium text-lg mb-4 text-center text-gray-900 dark:text-white">
                Resumen Financiero
              </h5>
              <div className="flex justify-center gap-2 text-sm mb-6">
                <span className="text-gray-600 dark:text-gray-400">Monto apertura:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {formatCurrencyNoDecimals(caja.monto_apertura)}
                </span>
              </div>

              {/* Tarjetas de resumen principal */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {/* Tragos Chicas */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">TRAGOS CHICAS</div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.total_venta)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Propinas: {loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.propinas)}
                    </div>
                    {/* Desglose */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Monto Venta:</span>
                        <span className="text-blue-600 dark:text-blue-400">{loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.monto_productos)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Comisiones:</span>
                        <span className="text-purple-600 dark:text-purple-400">{loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.comisiones)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Champañas */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">CHAMPAÑAS</div>
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                      {loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.total_venta)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Propinas: {loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.propinas)}
                    </div>
                    {/* Desglose */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Monto (sin comisión):</span>
                        <span className="text-purple-600 dark:text-purple-400">{loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.monto_champagne - ventasChampagne.comisiones)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Comisiones:</span>
                        <span className="text-blue-600 dark:text-blue-400">{loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.comisiones)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Barras */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">BARRAS</div>
                    <div className="text-lg font-bold text-orange-700 dark:text-orange-300">
                      {loadingBarras ? '...' : formatCurrencyNoDecimals(ventasBarras.total_venta)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Propinas: {loadingBarras ? '...' : formatCurrencyNoDecimals(ventasBarras.propinas)}
                    </div>
                    {/* Desglose */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Monto Venta:</span>
                        <span className="text-orange-600 dark:text-orange-400">{loadingBarras ? '...' : formatCurrencyNoDecimals(ventasBarras.monto_productos)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Sin comisiones</span>
                        <span className="text-gray-400 dark:text-gray-500">-</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Servicios */}
                <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="text-center">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">SERVICIOS</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {formatCurrencyNoDecimals(caja.servicios)}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      IVA: {formatCurrencyNoDecimals(serviciosDesglose.total_iva)}
                    </div>
                    {/* Desglose */}
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-600 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Monto Servicio:</span>
                        <span className="text-green-600 dark:text-green-400">{formatCurrencyNoDecimals(serviciosDesglose.total_servicio_neto)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Habitaciones:</span>
                        <span className="text-blue-600 dark:text-blue-400">{formatCurrencyNoDecimals(serviciosDesglose.total_habitacion)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen de totales */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {/* Total Propinas */}
                <div className="bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-200 dark:border-green-700">
                  <div className="text-center">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">TOTAL PROPINAS</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {(loadingTragosChicas || loadingChampagne || loadingBarras) ? '...' : formatCurrencyNoDecimals(Number(ventasTragosChicas.propinas || 0) + Number(ventasChampagne.propinas || 0) + Number(ventasBarras.propinas || 0))}
                    </div>
                    {/* Desglose de propinas */}
                    <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tragos Chicas:</span>
                        <span className="text-green-600 dark:text-green-400">{loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.propinas || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Champañas:</span>
                        <span className="text-green-600 dark:text-green-400">{loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.propinas || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Barras:</span>
                        <span className="text-green-600 dark:text-green-400">{loadingBarras ? '...' : formatCurrencyNoDecimals(ventasBarras.propinas || 0)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Ingresos */}
                <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                  <div className="text-center">
                    <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">TOTAL INGRESOS</div>
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                      {formatCurrencyNoDecimals(totalIngresos)}
                    </div>
                    {/* Desglose de ingresos */}
                    <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Tragos Chicas:</span>
                        <span className="text-blue-600 dark:text-blue-400">{loadingTragosChicas ? '...' : formatCurrencyNoDecimals(ventasTragosChicas.total_venta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Champañas:</span>
                        <span className="text-blue-600 dark:text-blue-400">{loadingChampagne ? '...' : formatCurrencyNoDecimals(ventasChampagne.total_venta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Barras:</span>
                        <span className="text-blue-600 dark:text-blue-400">{loadingBarras ? '...' : formatCurrencyNoDecimals(ventasBarras.total_venta)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Servicios:</span>
                        <span className="text-blue-600 dark:text-blue-400">{formatCurrencyNoDecimals(caja.servicios)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Total Egresos */}
                <div className="bg-red-50 dark:bg-red-900/30 p-3 rounded-lg border border-red-200 dark:border-red-700">
                  <div className="text-center">
                    <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">TOTAL EGRESOS</div>
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      -{formatCurrencyNoDecimals(totalEgresos)}
                    </div>
                    {/* Desglose de egresos */}
                    <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-700 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Devoluciones:</span>
                        <span className="text-red-600 dark:text-red-400">{formatCurrencyNoDecimals(caja.devoluciones)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Anticipos:</span>
                        <span className="text-red-600 dark:text-red-400">{formatCurrencyNoDecimals(caja.anticipo || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Retiros:</span>
                        <span className="text-red-600 dark:text-red-400">{formatCurrencyNoDecimals(retiros.reduce((sum, r) => sum + r.monto, 0))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Distribución del dinero */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600 mb-4">
                <h6 className="font-medium text-gray-800 dark:text-white text-base mb-4 text-center flex items-center justify-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Distribución del Dinero
                </h6>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Monto Apertura */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-blue-200 dark:border-blue-600 shadow-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">APERTURA</div>
                      <div className="text-sm font-bold text-blue-700 dark:text-blue-300">
                        {formatCurrencyNoDecimals(caja.monto_apertura)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Inicial</div>
                    </div>
                  </div>

                  {/* En Caja */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-green-200 dark:border-green-600 shadow-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">EN EFECTIVO</div>
                      <div className="text-sm font-bold text-green-700 dark:text-green-300">
                        {formatCurrencyNoDecimals(efectivoRealEnCaja)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Efectivo</div>
                    </div>
                  </div>

                  {/* Tarjeta */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-purple-200 dark:border-purple-600 shadow-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v2H4V6zm0 4h12v4H4v-4z" />
                        </svg>
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">TARJETA</div>
                      <div className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        {formatCurrencyNoDecimals(caja.tarjeta)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Débito/Crédito</div>
                    </div>
                  </div>

                  {/* Transferencia */}
                  <div className="bg-white dark:bg-gray-700 p-3 rounded-lg border border-orange-200 dark:border-orange-600 shadow-sm">
                    <div className="text-center">
                      <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                        </svg>
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">TRANSFERENCIA</div>
                      <div className="text-sm font-bold text-orange-700 dark:text-orange-300">
                        {formatCurrencyNoDecimals(caja.transferencia)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bancaria</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Balance Final */}
              <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 p-4 rounded-lg border-2 border-gray-300 dark:border-gray-600">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg text-gray-800 dark:text-white">Balance Final:</span>
                  <span
                    className={`font-bold text-2xl ${balanceActual >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      }`}
                  >
                    {formatCurrencyNoDecimals(balanceActual)}
                  </span>
                </div>
              </div>
            </div>

            {/* Historial de Retiros */}
            <div className='bg-gray-50 dark:bg-gray-800 p-4 rounded-lg'>
              <h5 className='font-medium text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2'>
                <ArrowDownCircle className='w-5 h-5 text-orange-600 dark:text-orange-400' />
                Historial de Retiros
              </h5>

              {retirosLoading ? (
                <div className='flex justify-center items-center py-8'>
                  <Loader2 className='h-6 w-6 animate-spin text-gray-400 dark:text-gray-500' />
                </div>
              ) : retiros.length === 0 ? (
                <div className='text-center py-8 text-gray-500 dark:text-gray-400 text-sm'>
                  No hay retiros registrados para esta caja
                </div>
              ) : (
                <div className='space-y-3'>
                  {retiros.map((retiro) => (
                    <div
                      key={retiro.id_retiro}
                      className='bg-white dark:bg-gray-700 p-3 rounded-lg border border-gray-200 dark:border-gray-600'
                    >
                      <div className='flex justify-between items-start mb-2'>
                        <div className='flex-1'>
                          <div className='flex items-center gap-2 mb-1'>
                            <span className='font-medium text-orange-600 dark:text-orange-400'>
                              -${Math.round(retiro.monto).toLocaleString()}
                            </span>
                            <span className='text-xs text-gray-500 dark:text-gray-400'>
                              por {retiro.usuario_nombre || 'Usuario desconocido'}
                            </span>
                          </div>
                          <p className='text-sm text-gray-600 dark:text-gray-300'>{retiro.motivo}</p>
                        </div>
                        <span className='text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-2'>
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
                    <div className='border-t border-gray-200 dark:border-gray-600 pt-3 mt-3'>
                      <div className='flex justify-between text-sm font-medium text-gray-700 dark:text-gray-300'>
                        <span>Total Retirado:</span>
                        <span className='text-orange-600 dark:text-orange-400'>
                          -${Math.round(retiros.reduce((sum, r) => sum + r.monto, 0)).toLocaleString()}
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
                          <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">ANFITRIONA</TableHead>
                          <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">GARZÓN</TableHead>
                          <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">CAJERO</TableHead>
                          <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">TIPO VENTA</TableHead>
                          <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">FECHA</TableHead>
                          <TableHead className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">MÉTODO PAGO</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">COMISIÓN</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">PROPINA</TableHead>
                          <TableHead className="text-right text-xs sm:text-sm text-gray-700 dark:text-gray-300">TOTAL</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {getPaginatedVentas().map((venta: any) => (
                          <TableRow key={venta.id_venta} className="border-gray-200 dark:border-gray-700">
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {venta.cliente_nombre || 'Sin cliente'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {venta.usuarios_nicks || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {venta.garzon_nick || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {venta.cajero_nick || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              <Badge
                                variant="outline"
                                className={`text-xs px-2 py-0.5 ${venta.tiene_comision
                                  ? 'border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
                                  : 'border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30'
                                  }`}
                              >
                                {venta.tiene_comision ? 'Con Chica' : 'En Barra'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm text-gray-900 dark:text-gray-100">
                              <div className="flex flex-col">
                                <span>{new Date(venta.fecha_crea).toLocaleDateString('es-ES')}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(venta.fecha_crea).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm capitalize">
                              <Badge variant="secondary" className="text-xs px-2 py-0.5 dark:bg-gray-700 dark:text-gray-200">
                                {venta.metodo_pago}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">
                              <div className="flex flex-col items-end gap-1">
                                <span>{formatCurrencyNoDecimals((venta.comision || 0) / (venta.usuarios?.length || 1))}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {venta.usuarios?.length ? `por anfitriona (${venta.usuarios.length})` : 'total'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                              {formatCurrencyNoDecimals(venta.propina || 0)}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                              {formatCurrencyNoDecimals(venta.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Paginador de ventas */}
                  <Paginate
                    page={ventasPage}
                    totalPages={getTotalVentasPages()}
                    setPage={handleVentasPageChange}
                  />
                </div>
              )}
            </div>

            {/* Servicios Detallados */}
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
                        {getPaginatedServicios().map((servicio: any) => (
                          <TableRow key={servicio.id_servicio} className="border-gray-200 dark:border-gray-700">
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {servicio.cliente_nombre || 'Sin cliente'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {servicio.anfitrionas_nombres || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {servicio.usuario_nick || 'N/A'}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">
                              {servicio.habitacion_numero || 'N/A'}
                            </TableCell>
                            <TableCell className="text-right text-xs sm:text-sm font-semibold text-green-600 dark:text-green-400">
                              <div className="flex flex-col items-end gap-1">
                                <span>{formatCurrencyNoDecimals((servicio.precio_servicio || 0) / ((servicio.anfitrionas_nombres?.split(',').length) || 1))}</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {servicio.anfitrionas_nombres ? `por anfitriona (${servicio.anfitrionas_nombres.split(',').length})` : 'total'}
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
                                <span>{new Date(servicio.fecha_crea).toLocaleDateString('es-ES')}</span>
                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                  {new Date(servicio.fecha_crea).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
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

                  {/* Paginador de servicios */}
                  <Paginate
                    page={serviciosPage}
                    totalPages={getTotalServiciosPages()}
                    setPage={handleServiciosPageChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer con botón - fijo en la parte inferior */}
        <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 bg-white dark:bg-gray-900">
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full px-6 bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200"
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
