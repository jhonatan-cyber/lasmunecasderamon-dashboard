import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CajaWithUser, CajaCierre } from "@/types/caja";
import { useUsers } from "@/hooks/useUsers";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { formatCurrency } from "@/lib/formatters";
import { Loader2 } from "lucide-react";

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

interface CerrarCajaDialogProps {
  caja: CajaWithUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCerrarCaja: (data: CajaCierre) => Promise<void>;
  loading?: boolean;
}

export const CerrarCajaDialog = ({
  caja,
  open,
  onOpenChange,
  onCerrarCaja,
  loading = false,
}: CerrarCajaDialogProps) => {
  const [formData, setFormData] = useState<CajaCierre>({
    id_caja: 0,
    usuario_id_cierre: 0,
    fecha_cierre: new Date().toISOString(),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { users, isLoading: usersLoading } = useUsers();
  const { user: currentUser, loading: currentUserLoading } = useCurrentUser();

  // Actualizar formData cuando cambia la caja o el usuario actual
  useEffect(() => {
    if (caja && currentUser) {
      setFormData({
        id_caja: caja.id_caja,
        usuario_id_cierre: currentUser.id,
        fecha_cierre: new Date().toISOString(),
      });
    }
  }, [caja, currentUser]);



  const validateForm = (): boolean => {
    // No hay validaciones necesarias ya que todo se calcula automáticamente
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      // Calcular monto de cierre automáticamente si no se pide al usuario
      const devoluciones = (caja.devoluciones as number) || 0;
      const montoCierreCalculado =
        (caja.monto_apertura || 0) +
        (caja.efectivo || 0) +
        (caja.tarjeta || 0) +
        (caja.transferencia || 0) -
        devoluciones;

      // Asegurar que se envíe la fecha actual al momento del cierre y el monto_cierre requerido por la API
      const dataToSend = {
        ...formData,
        monto_cierre: Number(montoCierreCalculado) || 0,
        fecha_cierre: new Date().toISOString(),
      } as CajaCierre & { monto_cierre: number };

      await onCerrarCaja(dataToSend);
      onOpenChange(false);
      setFormData({
        id_caja: 0,
        usuario_id_cierre: 0,
        fecha_cierre: new Date().toISOString(),
      });
      setErrors({});
    } catch (error) {
      console.error("Error al cerrar caja:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setFormData({
      id_caja: 0,
      usuario_id_cierre: 0,
      fecha_cierre: new Date().toISOString(),
    });
    setErrors({});
  };

  if (!caja) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle>
            Cerrar Caja {getDiaSemana(caja.fecha_apertura)}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Resumen de la caja */}
            <div className="bg-gray-50 p-1 px-2  rounded-lg space-y-2">
              <h4 className="font-medium text-sm">Resumen de la caja:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Apertura:</span>
                  <span className="ml-2 mr-2 font-medium">
                    ${Math.round(caja.monto_apertura).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Ventas:</span>
                  <span className="ml-2 mr-2 font-medium text-green-600">
                    ${Math.round(caja.ventas).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Efectivo:</span>
                  <span className="ml-2 mr-2 font-medium">
                    ${Math.round(caja.efectivo).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Tarjeta:</span>
                  <span className="ml-2 mr-2 font-medium">
                    ${Math.round(caja.tarjeta).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Transferencia:</span>
                  <span className="ml-2 mr-2 font-medium text-sm">
                    ${Math.round(caja.transferencia).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Servicios:</span>
                  <span className="ml-2 mr-2 font-medium">
                    ${Math.round(caja.servicios).toLocaleString()}
                  </span>
                </div>
                {caja.devoluciones > 0 && (
                  <div>
                    <span className="text-gray-500">Devoluciones:</span>
                    <span className="ml-2 mr-2 font-medium text-red-600">
                      -${Math.round(caja.devoluciones).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t px-6 py-4">
          <form onSubmit={handleSubmit}>
            <div className="flex justify-center gap-2 text-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-6 bg-black text-white hover:scale-110 transition-all duration-200"
                onClick={handleClose}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading || usersLoading}
                size="sm"
                variant="outline"
                className="rounded-full px-6 bg-red-600 text-white hover:scale-110 transition-all duration-200"
              >
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Cerrar Caja
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
