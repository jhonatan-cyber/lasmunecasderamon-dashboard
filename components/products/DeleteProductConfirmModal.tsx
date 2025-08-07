import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DeleteProductConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  productName: string;
}

export function DeleteProductConfirmModal({
  open,
  onOpenChange,
  onConfirm,
  productName,
}: DeleteProductConfirmModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 mb-4">
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              className="text-red-500"
            />
            <span className="text-gray-900">Confirmar Eliminación</span>
          </DialogTitle>
          <DialogDescription className="text-left">
            <p className="text-gray-700 mb-2 text-center">
              ¿Estás seguro de que quieres eliminar el producto{" "}
              <span className="font-semibold text-gray-900">
                "{productName}"
              </span>
              ?
            </p>
            <p className="mt-3 text-sm text-red-400 font-medium text-center">
              Esta acción no se puede revertir. El producto será eliminado
              permanentemente.
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center items-center gap-4 pt-4">
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
      </DialogContent>
    </Dialog>
  );
}
