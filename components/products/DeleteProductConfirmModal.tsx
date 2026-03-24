/* eslint-disable react/no-unescaped-entities */
import React from "react";
import { AlertTriangle } from 'lucide-react';
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
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-red-100 p-3 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">¿Estás seguro?</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Confirmación para eliminar el producto
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="text-left">
            <div className="text-gray-700 mb-2 text-center">
              ¿Estás seguro de que quieres eliminar el producto
              <span className="font-semibold text-gray-900"> "{productName}"</span>?
            </div>
            <div className="mt-3 text-sm text-red-400 font-medium text-center">
              Esta acción no se puede revertir. El producto será eliminado permanentemente.
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

