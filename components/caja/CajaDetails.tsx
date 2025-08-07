import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CajaWithUser } from "@/types/caja";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLock,
  faDollarSign,
  faCalendar,
  faArrowTrendDown,
  faArrowTrendUp,
} from "@fortawesome/free-solid-svg-icons";

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
        icon: faDollarSign,
      };
    case 0:
      return {
        label: "Cerrada",
        color: "bg-red-100 text-red-800",
        icon: faLock,
      };
    default:
      return {
        label: "Eliminada",
        color: "bg-gray-100 text-gray-800",
        icon: faLock,
      };
  }
};

export const CajaDetails = ({ caja, open, onOpenChange }: CajaDetailsProps) => {
  if (!caja) return null;

  const estadoInfo = getEstadoInfo(caja.estado);

  const totalIngresos = caja.efectivo + caja.tarjeta + caja.transferencia;
  const balanceActual = caja.monto_apertura + totalIngresos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              Detalles de Caja {getDiaSemana(caja.fecha_apertura)}{" "}
              <Badge variant="secondary" className={estadoInfo.color}>
                {estadoInfo.label}
              </Badge>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            ></Button>
          </div>
        </DialogHeader>

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
                <FontAwesomeIcon icon={faCalendar} />
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
                  <FontAwesomeIcon icon={faCalendar} />
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
                  <FontAwesomeIcon icon={faArrowTrendUp} />
                  Ingresos
                </span>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ventas:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrencyNoDecimals(caja.ventas)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Servicios:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrencyNoDecimals(caja.servicios)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Propinas:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrencyNoDecimals(caja.propina || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gastos y balance */}
              <div className="space-y-3">
                <h4 className="font-medium text-red-700 flex items-center gap-2">
                  <FontAwesomeIcon icon={faArrowTrendDown} />
                  Egresos
                </h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Devoluciones:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyNoDecimals(caja.devoluciones)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Anticipo:</span>
                    <span className="font-medium text-red-600">
                      -{formatCurrencyNoDecimals(caja.anticipo || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t pt-2 mt-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Efectivo:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(
                    caja.efectivo + caja.monto_apertura
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tarjeta:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.tarjeta)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Transferencia:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.transferencia)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA:</span>
                <span className="font-medium">
                  {formatCurrencyNoDecimals(caja.iva || 0)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Comisiones:</span>
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
