import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CajaWithUser } from "@/types/caja";
import { Eye, Lock, DollarSign, ArrowDownCircle } from "lucide-react";

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

interface CajaCardProps {
  caja: CajaWithUser;
  onViewDetails: (caja: CajaWithUser) => void;
  onCloseCaja: (caja: CajaWithUser) => void;
  onRetirar?: (caja: CajaWithUser) => void;
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

export const CajaCard = ({
  caja,
  onViewDetails,
  onCloseCaja,
  onRetirar,
}: CajaCardProps) => {
  const estadoInfo = getEstadoInfo(caja.estado);
  const Icon = estadoInfo.icon;

  const totalIngresos = caja.efectivo + caja.tarjeta + caja.transferencia;
  const balanceActual = caja.monto_apertura + totalIngresos - caja.devoluciones;

  return (
    <Card className="hover:shadow-md transition-shadow shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg">
              Caja {getDiaSemana(caja.fecha_apertura)}
            </CardTitle>
            <p className="text-xs sm:text-sm text-gray-500">
              {new Date(caja.fecha_apertura).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge variant="secondary" className={`${estadoInfo.color} text-xs sm:text-sm`}>
            {estadoInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between text-xs sm:text-sm">
            <span className="text-gray-500">Usuario de apertura:</span>
            <span className="font-medium">{caja.cajero_nombre || "N/A"}</span>
          </div>
          {caja.cajero_cierre_nombre && (
            <div className="flex justify-between text-xs sm:text-sm">
              <span className="text-gray-500">Cerrada por:</span>
              <span className="font-medium">{caja.cajero_cierre_nombre}</span>
            </div>
          )}
          {caja.fecha_cierre && (
            <div className="flex justify-between text-xs sm:text-sm">
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

        <div className="space-y-2 pt-3 border-t">
          <div className="flex justify-between">
            <span className="text-xs sm:text-sm text-gray-500">Monto de apertura:</span>
            <span className="text-xs sm:text-sm font-medium">
              ${Math.round(caja.monto_apertura).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between border-t pt-2">
            <span className="text-xs sm:text-sm text-gray-500">Monto en Efectivo:</span>
            <span className="text-xs sm:text-sm font-medium">
              ${Math.round(caja.efectivo).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs sm:text-sm text-gray-500">Monto en Tarjeta:</span>
            <span className="text-xs sm:text-sm font-medium">
              ${Math.round(caja.tarjeta).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs sm:text-sm text-gray-500">
              Monto en Transferencia:
            </span>
            <span className="text-xs sm:text-sm font-medium">
              ${Math.round(caja.transferencia).toLocaleString()}
            </span>
          </div>

          <div className="flex justify-between pt-2 border-t">
            <span className="font-medium text-sm sm:text-base">Balance actual:</span>
            <span
              className={`font-bold text-base sm:text-lg ${balanceActual >= 0 ? "text-green-600" : "text-red-600"
                }`}
            >
              ${Math.round(balanceActual).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-full px-4 py-2 bg-black text-white hover:scale-105 transition-all duration-200 text-xs sm:text-sm h-10"
            onClick={() => onViewDetails(caja)}
          >
            <Eye className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Ver Detalle</span>
          </Button>
          {caja.estado === 1 && (
<<<<<<< HEAD
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-full px-2 sm:px-4 py-2 hover:scale-105 transition-all duration-200 hover:bg-green-600 hover:text-white text-xs sm:text-sm h-10 min-w-0"
                onClick={() => onRetirar?.(caja)}
              >
                <ArrowDownCircle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Retirar</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 rounded-full px-2 sm:px-4 py-2 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs sm:text-sm h-10 min-w-0"
                onClick={() => onCloseCaja(caja)}
              >
                <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Cerrar Caja</span>
              </Button>
            </>
=======
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-full px-4 py-2 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs sm:text-sm h-10"
              onClick={() => onCloseCaja(caja)}
            >
              <Lock className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>Cerrar Caja</span>
            </Button>
>>>>>>> 1e378ec (oficina)
          )}
        </div>
      </CardContent>
    </Card>
  );
};
