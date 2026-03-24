"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

import {
  CheckCircle,
  XCircle,
} from "lucide-react";
import { formatCurrencyCLP } from "@/lib/formatters";

interface AnulacionConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccept?: () => void;
  data: {
    tipo: "confirmada" | "rechazada";
    tipo_operacion: "venta" | "servicio";
    venta?: {
      codigo: string;
      cliente: string;
      total: number;
    };
    servicio?: {
      codigo: string;
      cliente: string;
      habitacion?: string;
      tiempo?: number;
      total: number;
      anfitrionas?: string;
    };
  } | null;
}

export function AnulacionConfirmModal({
  open,
  onOpenChange,
  onAccept,
  data,
}: AnulacionConfirmModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    } else {
      handleClose();
    }
  };

  if (!data) return null;

  const { tipo, tipo_operacion, venta, servicio } = data;
  const isConfirmada = tipo === "confirmada";
  const isServicio = tipo_operacion === "servicio";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 mb-4">
            {isConfirmada ? (
              <CheckCircle className="text-green-500 dark:text-green-400" />
            ) : (
              <XCircle className="text-red-500 dark:text-red-400" />
            )}
            <span className={isConfirmada ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400"}>
              {isConfirmada
                ? `✅ Anulación de ${isServicio ? 'Servicio' : 'Venta'} Confirmada`
                : `❌ Anulación de ${isServicio ? 'Servicio' : 'Venta'} Rechazada`}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-left">
            {isConfirmada ? (
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {isServicio ? 'El servicio ha sido anulado exitosamente.' : 'La venta ha sido anulada exitosamente.'}
                </p>
                <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <strong>Código:</strong> {isServicio ? servicio?.codigo : venta?.codigo}
                    </p>
                    <p>
                      <strong>Cliente:</strong> {isServicio ? servicio?.cliente : venta?.cliente}
                    </p>
                    {isServicio && servicio?.habitacion && (
                      <p>
                        <strong>Habitación:</strong> {servicio.habitacion}
                      </p>
                    )}
                    {isServicio && servicio?.tiempo && (
                      <p>
                        <strong>Tiempo:</strong> {servicio.tiempo} minutos
                      </p>
                    )}
                    {isServicio && servicio?.anfitrionas && (
                      <p>
                        <strong>Anfitriones:</strong> {servicio.anfitrionas}
                      </p>
                    )}
                    <p>
                      <strong>Total:</strong> {formatCurrencyCLP((isServicio ? servicio?.total : venta?.total) || 0)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {isServicio ? 'El servicio ya no está activo en el sistema.' : 'La venta ya no está activa en el sistema.'}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                  {isServicio ? 'La solicitud de anulación de servicio ha sido rechazada.' : 'La solicitud de anulación ha sido rechazada.'}
                </p>
                <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <p>
                      <strong>Código:</strong> {isServicio ? servicio?.codigo : venta?.codigo}
                    </p>
                    <p>
                      <strong>Cliente:</strong> {isServicio ? servicio?.cliente : venta?.cliente}
                    </p>
                    {isServicio && servicio?.habitacion && (
                      <p>
                        <strong>Habitación:</strong> {servicio.habitacion}
                      </p>
                    )}
                    {isServicio && servicio?.tiempo && (
                      <p>
                        <strong>Tiempo:</strong> {servicio.tiempo} minutos
                      </p>
                    )}
                    {isServicio && servicio?.anfitrionas && (
                      <p>
                        <strong>Anfitriones:</strong> {servicio.anfitrionas}
                      </p>
                    )}
                    <p>
                      <strong>Total:</strong> {formatCurrencyCLP((isServicio ? servicio?.total : venta?.total) || 0)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                  {isServicio ? 'El servicio permanece activo en el sistema.' : 'La venta permanece activa en el sistema.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 border-t dark:border-gray-700 px-6 py-4">
          <div className="flex justify-center items-center">
            <Button
              onClick={handleAccept}
              className="rounded-full bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200"
            >
              Aceptar
            </Button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
