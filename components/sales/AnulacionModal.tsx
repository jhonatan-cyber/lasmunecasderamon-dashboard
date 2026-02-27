"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface AnulacionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (motivo: string) => void;
  loading?: boolean;
  ventaInfo?: {
    codigo: string;
    total: number;
    cliente_nombre: string;
  };
}

export function AnulacionModal({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
  ventaInfo,
}: AnulacionModalProps) {
  const [motivo, setMotivo] = useState("");

  const handleConfirm = () => {
    if (motivo.trim()) {
      onConfirm(motivo.trim());
      setMotivo(""); // Limpiar después de confirmar
    }
  };

  const handleCancel = () => {
    setMotivo("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[425px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b dark:border-gray-700">
          <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400 mb-4 sm:mb-6 text-lg sm:text-xl">
            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            Solicitud Anulación
          </DialogTitle>
          <DialogDescription className="text-center text-sm sm:text-base text-gray-600 dark:text-gray-400">
            ¿Estás seguro de que deseas solicitar la anulación de esta venta?
            Esta acción requerirá la aprobación del administrador.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {ventaInfo && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  <strong>Codigo de venta:</strong> {ventaInfo.codigo}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  <strong>Cliente:</strong> {ventaInfo.cliente_nombre}
                </div>
                <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                  <strong>Total:</strong> $
                  {ventaInfo.total?.toLocaleString() || 0}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="motivo" className="text-sm sm:text-base font-medium text-gray-900 dark:text-gray-100">
                Motivo de la anulación *
              </Label>
              <Textarea
                id="motivo"
                placeholder="Describe el motivo de la anulación..."
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="min-h-[100px] text-sm sm:text-base bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 border-t dark:border-gray-700 px-6 py-4">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Button
              size="sm"
              variant="outline"
              className="rounded-full hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black text-sm sm:text-base w-full sm:w-auto"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading || !motivo.trim()}
              size="sm"
              variant="outline"
              className="rounded-full bg-black dark:bg-white text-white dark:text-black hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"
            >
              {loading ? "Enviando..." : "Solicitar Anulación"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
