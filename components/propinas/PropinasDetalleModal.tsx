"use client";

import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { User, DollarSign, X } from "lucide-react";
import { formatCurrencyNoDecimals, formatFechaLarga } from "@/lib/formatters";
import { useTipsDetalle } from "@/hooks/useTips";
import { PropinaResumen } from "@/types/propina";

interface PropinasDetalleModalProps {
  open: boolean;
  onClose: () => void;
  usuario: PropinaResumen | null;
}

export default function PropinasDetalleModal({
  open,
  onClose,
  usuario,
}: PropinasDetalleModalProps) {
  const { detalles, loading, error, fetchDetalles } = useTipsDetalle(usuario?.id_usuario);

  useEffect(() => {
    if (open && usuario) {
      fetchDetalles(usuario.id_usuario);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, usuario]);

  const getEstadoColor = (estado: string) => {
    return estado === "Por pagar"
      ? "bg-purple-100 text-purple-800"
      : "bg-green-100 text-green-800";
  };

  if (!usuario) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[700px] max-h-[80vh] overflow-y-auto p-0">
        <DialogHeader>
          <DialogTitle className="text-center text-base sm:text-lg font-semibold pt-4 sm:pt-6 pb-2">
            Información de los Tips
          </DialogTitle>
        </DialogHeader>

        {/* Información del usuario */}
        <div className="border-b pb-4 mb-4 flex flex-col items-center gap-1 px-4 sm:px-6">
          <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
            <User className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium text-xs sm:text-sm">
              {usuario.nombre} {usuario.apellido}
            </span>
          </div>
          <div className="flex items-center gap-2 text-gray-700 text-sm sm:text-base">
            <DollarSign className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
            <span className="font-medium text-xs sm:text-sm">
              Total a pagar: {formatCurrencyNoDecimals(usuario.total)}
            </span>
          </div>
        </div>

        {/* Tabla de detalles */}
        <div className="px-4 sm:px-6 pb-2">
          <h3 className="text-xs sm:text-sm font-semibold mb-4 text-center text-gray-600">
            Detalle de Tips
          </h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs sm:text-sm">FECHA HORA</TableHead>
                  <TableHead className="text-xs sm:text-sm">CODIGO VENTA</TableHead>
                  <TableHead className="text-xs sm:text-sm">MONTO</TableHead>
                  <TableHead className="text-xs sm:text-sm">FECHA PAGO</TableHead>
                  <TableHead className="text-xs sm:text-sm">ESTADO</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-6 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-red-600 text-xs sm:text-sm">
                      {error}
                      <Button
                        onClick={() => fetchDetalles(usuario.id_usuario)}
                        className="mt-2 ml-4 text-xs sm:text-sm"
                      >
                        Reintentar
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : detalles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-600 text-xs sm:text-sm">
                      No hay detalles de tips para mostrar
                    </TableCell>
                  </TableRow>
                ) : (
                  detalles.map((detalle, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-xs sm:text-sm">
                        {formatFechaLarga(detalle.fecha_hora)}
                      </TableCell>
                      <TableCell className="font-mono text-xs sm:text-sm">
                        {detalle.codigo_venta}
                      </TableCell>
                      <TableCell className="font-semibold text-xs sm:text-sm">
                        {formatCurrencyNoDecimals(detalle.monto)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {detalle.fecha_pago
                          ? formatFechaLarga(detalle.fecha_pago)
                          : "Por pagar"}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        <Badge className={`${getEstadoColor(detalle.estado)} text-xs sm:text-sm`}>
                          {detalle.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Botón cerrar */}
        <div className="flex justify-center mt-4 sm:mt-6 pb-4 sm:pb-6">
          <Button
            size="sm"
            variant="outline"
            onClick={onClose}
            className="rounded-full text-white bg-black hover:scale-105 transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
          >
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
