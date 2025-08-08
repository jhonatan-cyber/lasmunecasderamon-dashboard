"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User, Home, DollarSign, Calendar, Receipt, Users } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import { toast } from "sonner";
import AgregarProductosModal from "./AgregarProductosModal";

interface CuentaDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaId: number | null;
  onRefresh?: () => void;
}

interface CuentaDetalle {
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  fecha_crea: string;
  anfitrionaId?: string;
  anfitrionas?: string;
  producto?: string;
  id_producto: number;
}

interface CuentaUsuario {
  id_cuenta_usuario: number;
  cuenta_id: number;
  usuario_id: number;
  usuario_nombre?: string;
}

interface CuentaCompleta {
  id_cuenta: number;
  codigo: string;
  cliente_id: number;
  cliente_nombre: string;
  total_comision: number;
  habitacion_id: number | null;
  habitacion_numero: string | null;
  sub_total: number;
  total: number;
  pedido_id: number | null;
  servicio_id: number | null;
  fecha_crea: string;
  estado: number;
  detalles: CuentaDetalle[];
  usuarios: CuentaUsuario[];
  anfitrionas_ids?: string;
  anfitrionas_generales?: string;
}

export default function CuentaDetailModal({
  open,
  onOpenChange,
  cuentaId,
  onRefresh,
}: CuentaDetailModalProps) {
  const [cuenta, setCuenta] = useState<CuentaCompleta | null>(null);
  const [loading, setLoading] = useState(false);
  const [agregarProductosOpen, setAgregarProductosOpen] = useState(false);
  const [cobrarCuentaOpen, setCobrarCuentaOpen] = useState(false);

  // Log para debuggear el estado del modal
  useEffect(() => {
    console.log("Estado del modal agregar productos:", agregarProductosOpen);
  }, [agregarProductosOpen]);

  useEffect(() => {
    if (open && cuentaId) {
      fetchCuentaDetails();
    }
  }, [open, cuentaId]);

  const fetchCuentaDetails = async () => {
    if (!cuentaId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/cuentas/${cuentaId}`);
      if (!response.ok) {
        throw new Error("Error al obtener los detalles de la cuenta");
      }
      const data = await response.json();
      setCuenta(data);
    } catch (error) {
      console.error("Error al obtener cuenta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al obtener los detalles"
      );
    } finally {
      setLoading(false);
    }
  };

  const getEstadoBadge = (estado: number) => {
    switch (estado) {
      case 1:
        return <Badge className="bg-red-100 text-red-800">Por Cobrar</Badge>;
      case 0:
        return <Badge className="bg-green-100 text-green-800">Cobrada</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconocido</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleClose = () => {
    setCuenta(null);
    onOpenChange(false);
  };

  const handleProductosAgregados = () => {
    fetchCuentaDetails();
    // También actualizar la tabla principal si se proporciona la función
    if (onRefresh) {
      onRefresh();
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mt-4">
            <DialogTitle className="text-xl font-semibold">
              Detalles de Cuenta
            </DialogTitle>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <span className="ml-2">Cargando detalles...</span>
          </div>
        ) : cuenta ? (
          <div className="space-y-6">
            {/* Información general */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Receipt className="text-gray-500 w-4 h-4" />
                    <Label className="text-sm font-medium">Código:</Label>
                    <span className="text-sm font-semibold">
                      {cuenta.codigo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="text-gray-500 w-4 h-4" />
                    <Label className="text-sm font-medium">Cliente:</Label>
                    <span className="text-sm">
                      {cuenta.cliente_nombre || "Sin cliente"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="text-gray-500 w-4 h-4" />
                    <Label className="text-sm font-medium">Anfitrionas:</Label>
                    <span className="text-sm text-purple-600 font-medium">
                      {cuenta.anfitrionas_generales || "Sin anfitrionas"}
                    </span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-gray-500 w-4 h-4" />
                    <Label className="text-sm font-medium">Fecha:</Label>
                    <span className="text-sm">
                      {formatDate(cuenta.fecha_crea)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-gray-500 w-4 h-4" />
                    <Label className="text-sm font-medium">Estado:</Label>
                    {getEstadoBadge(cuenta.estado)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Home className="text-gray-500 w-4 h-4" />
                    <Label className="text-sm font-medium">Habitación:</Label>
                    <span className="text-sm">
                      {cuenta.habitacion_numero || "Sin habitación"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen financiero */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-center mb-4 text-blue-800">
                Resumen Financiero
              </h3>
              <div className="grid grid-cols-1  gap-4 text-center">
                <div>
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrencyNoDecimals(cuenta.total)}
                  </div>
                </div>
              </div>
            </div>

            {/* Detalle de productos */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-center mb-4">
                <h3 className="text-sm font-semibold">Detalle de Productos</h3>
              </div>
              {cuenta.detalles && cuenta.detalles.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>PRODUCTO</TableHead>
                        <TableHead className="text-center">CANTIDAD</TableHead>
                        <TableHead className="text-right">PRECIO</TableHead>
                        <TableHead className="text-right">SUB TOTAL</TableHead>
                        <TableHead className="text-right">COMISIÓN</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cuenta.detalles.map((detalle, index) => (
                        <TableRow key={`${detalle.id_producto}-${index}`}>
                          <TableCell>
                            <div className="font-medium">
                              {detalle.producto ||
                                `Producto ID: ${detalle.id_producto}` ||
                                "Producto sin nombre"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {detalle.cantidad || 0}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNoDecimals(detalle.precio || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNoDecimals(detalle.sub_total || 0)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrencyNoDecimals(detalle.comision || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Fila de resumen */}
                      <TableRow className="bg-gray-50 font-semibold">
                        <TableCell colSpan={2}>
                          <div className="text-sm text-gray-600">
                            Total ({cuenta.detalles.length} producto
                            {cuenta.detalles.length !== 1 ? "s" : ""})
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm text-gray-600">-</div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm text-blue-600 font-bold">
                            {formatCurrencyNoDecimals(
                              cuenta.detalles.reduce(
                                (sum, detalle) =>
                                  sum + (detalle.sub_total || 0),
                                0
                              )
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="text-sm text-orange-600 font-bold">
                            {formatCurrencyNoDecimals(
                              cuenta.detalles.reduce(
                                (sum, detalle) => sum + (detalle.comision || 0),
                                0
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">
                    No hay productos registrados en esta cuenta
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-center gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClose}
                className="bg-black text-white rounded-full px-6 hover:scale-105 transition-all duration-200"
              >
                Cerrar
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">
              No se encontraron detalles de la cuenta
            </p>
          </div>
        )}
      </DialogContent>

      {/* Modal de Agregar Productos */}
      <AgregarProductosModal
        open={agregarProductosOpen}
        onOpenChange={setAgregarProductosOpen}
        cuentaId={cuentaId}
        onProductosAgregados={handleProductosAgregados}
      />
    </Dialog>
  );
}
