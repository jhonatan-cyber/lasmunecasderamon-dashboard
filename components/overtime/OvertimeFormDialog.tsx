"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useGarzones } from "@/hooks/useGarzones";
import { useOvertime } from "@/hooks/useOvertime";
import { toast } from "sonner";
import GarzonSelect from "@/components/overtime/GarzonSelect";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface OvertimeFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OvertimeFormDialog({
  open,
  onClose,
  onSuccess,
}: OvertimeFormDialogProps) {
  const { garzones } = useGarzones();
  const { createOvertime } = useOvertime();
  const [selectedUser, setSelectedUser] = useState("");
  const [hora, setHora] = useState("");
  const [monto, setMonto] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUser || !hora || !monto) {
      toast.error("Todos los campos son requeridos");
      return;
    }

    const horaNum = parseFloat(hora);
    const montoNum = parseFloat(monto);

    if (horaNum <= 0 || montoNum <= 0) {
      toast.error("Las horas y el monto deben ser mayores a 0");
      return;
    }

    if (horaNum > 24) {
      toast.error("Las horas no pueden ser mayores a 24");
      return;
    }

    setLoading(true);
    try {
      await createOvertime({
        usuario_id: parseInt(selectedUser),
        hora: horaNum,
        monto: montoNum,
      });

      toast.success("Hora extra creada exitosamente");
      handleClose();
      // Llamar callback de éxito para actualizar datos
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error al crear hora extra:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al crear la hora extra"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedUser("");
    setHora("");
    setMonto("");
    onClose();
  };

  const calculateTotal = () => {
    const horaNum = parseFloat(hora) || 0;
    const montoNum = parseFloat(monto) || 0;
    return horaNum * montoNum;
  };

  const formatNumber = (num: number) => {
    return Math.round(num).toLocaleString();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl lg:text-2xl font-semibold">
            Nueva Hora Extra
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div>
            <Label htmlFor="usuario" className="text-xs sm:text-sm font-medium">
              Garzón <span className="text-red-500">*</span>
            </Label>
            <GarzonSelect
              users={garzones}
              value={selectedUser}
              onChange={setSelectedUser}
              placeholder="Selecciona un garzón"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hora" className="text-xs sm:text-sm font-medium">
                Horas <span className="text-red-500">*</span>
              </Label>
              <Input
                id="hora"
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
                placeholder="Ej: 2.5"
                className="mt-1 text-xs sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Máximo 24 horas</p>
            </div>
            <div>
              <Label htmlFor="monto" className="text-xs sm:text-sm font-medium">
                Precio por Hora <span className="text-red-500">*</span>
              </Label>
              <Input
                id="monto"
                type="number"
                step="0.01"
                min="0"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="Ej: 15.00"
                className="mt-1 text-xs sm:text-sm"
              />
            </div>
          </div>

          {hora && monto && (
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200 text-center">
              <div className="text-xs sm:text-sm text-blue-700">
                <strong className="font-bold text-xs sm:text-sm">Total calculado:</strong>{" "}
                {formatCurrencyNoDecimals(calculateTotal())}
              </div>
              <div className="text-xs text-blue-600 mt-1">
                {hora} horas × {formatCurrencyNoDecimals(parseFloat(monto))} ={" "}
                {formatCurrencyNoDecimals(calculateTotal())}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-center gap-2 w-full">
            <Button
              type="button"
              onClick={handleClose}
              disabled={loading}
              variant="outline"
              size="sm"
              className="rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white text-xs sm:text-sm w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedUser || !hora || !monto}
              variant="outline"
              size="sm"
              className="rounded-full px-4 sm:px-6 hover:scale-105 transition-all duration-200 bg-black text-white text-xs sm:text-sm w-full sm:w-auto"
            >
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
