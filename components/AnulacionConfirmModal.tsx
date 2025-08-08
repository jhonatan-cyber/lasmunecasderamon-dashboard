"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  XCircle,
} from "lucide-react";

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
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(open && !!data);
  }, [open, data]);

  const handleClose = () => {
    setIsVisible(false);
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
    <Dialog open={isVisible} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mb-4">
            {isConfirmada ? (
              <CheckCircle className="text-green-500" />
            ) : (
              <XCircle className="text-red-500" />
            )}
            <span className={isConfirmada ? "text-green-500" : "text-red-500"}>
              {isConfirmada
                ? `✅ Anulación de ${isServicio ? 'Servicio' : 'Venta'} Confirmada`
                : `❌ Anulación de ${isServicio ? 'Servicio' : 'Venta'} Rechazada`}
            </span>
          </DialogTitle>
          <div className="text-left">
            {isConfirmada ? (
              <div>
                <p className="font-medium text-gray-900 mb-3">
                  {isServicio ? 'El servicio ha sido anulado exitosamente.' : 'La venta ha sido anulada exitosamente.'}
                </p>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="space-y-2 text-sm">
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
                      <strong>Total:</strong> $
                      {(isServicio ? servicio?.total : venta?.total)?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  {isServicio ? 'El servicio ya no está activo en el sistema.' : 'La venta ya no está activa en el sistema.'}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-gray-900 mb-3">
                  {isServicio ? 'La solicitud de anulación de servicio ha sido rechazada.' : 'La solicitud de anulación ha sido rechazada.'}
                </p>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="space-y-2 text-sm">
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
                      <strong>Total:</strong> $
                      {(isServicio ? servicio?.total : venta?.total)?.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-gray-600">
                  {isServicio ? 'El servicio permanece activo en el sistema.' : 'La venta permanece activa en el sistema.'}
                </p>
              </div>
            )}
          </div>
        </DialogHeader>

        <div className="flex justify-center items-center gap-4 pt-4">
          <Button
            onClick={handleAccept}
            className="rounded-full bg-black text-white text-white  hover:scale-105 transition-all duration-200"
          >
            Aceptar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}




