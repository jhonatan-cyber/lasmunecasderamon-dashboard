import React from "react";
import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteClientConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  clientName: string;
}

export function DeleteClientConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  clientName,
}: DeleteClientConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 mb-4">
            <AlertTriangle
              className="text-red-500"
            />
            <span className="text-gray-900">Confirmar Eliminación</span>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-left">
            <div className="text-gray-700 mb-2 text-center">
              ¿Estás seguro de que quieres eliminar al cliente{" "}
              <span className="font-semibold text-gray-900">
                "{clientName}"
              </span>
              ?
            </div>
            <div className="mt-3 text-sm text-red-400 font-medium text-center">
              Esta acción no se puede revertir. El cliente será eliminado
              permanentemente.
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 border-t px-6 py-4">
          <div className="flex justify-center items-center gap-4">
            <Button
              size="sm"
              className="flex items-center gap-2 rounded-full hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white"
              variant="outline"
              onClick={handleCancel}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex items-center bg-black text-white gap-2 rounded-full hover:scale-105 transition-all duration-200"
              variant="outline"
              onClick={handleConfirm}
            >
              Eliminar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}