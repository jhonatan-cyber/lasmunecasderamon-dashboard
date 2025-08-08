import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar, Clock, Tag, User, DollarSign, CreditCard, Home, Beer } from "lucide-react";
import { VentaWithDetails } from "@/types/venta";

interface SalesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVenta: VentaWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
}

export function SalesDetailModal({
  open,
  onOpenChange,
  selectedVenta,
  anfitrionaColors,
  metodoPagoLabels,
}: SalesDetailModalProps) {
  if (!selectedVenta) return null;

  const hasAnfitrionas = Array.isArray(selectedVenta.usuarios) && selectedVenta.usuarios.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto w-[95vw] max-w-[95vw] sm:w-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl lg:text-2xl font-bold mb-4 sm:mb-5">
            Información de la Venta
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">Fecha:</Label>
                <span className="text-xs sm:text-sm">
                  {selectedVenta.fecha_crea
                    ? new Date(
                        selectedVenta.fecha_crea
                      ).toLocaleDateString("es-ES")
                    : "Sin fecha"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">Hora:</Label>
                <span className="text-xs sm:text-sm">
                  {selectedVenta.fecha_crea
                    ? new Date(
                        selectedVenta.fecha_crea
                      ).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sin hora"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">Código:</Label>
                <span className="text-xs sm:text-sm font-mono">
                  {selectedVenta.codigo || "Sin código"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <User className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">
                  Anfitriona(s):
                </Label>
                <div className="flex flex-wrap gap-1">
                  {hasAnfitrionas ? (
                    selectedVenta.usuarios.map(
                      (usuario: any, index: number) => (
                        <Badge
                          key={usuario.id || index}
                          className={
                            anfitrionaColors[
                              index % anfitrionaColors.length
                            ]
                          }
                        >
                          {usuario.nick ||
                            usuario.usuario_nombre ||
                            "Sin nick"}
                        </Badge>
                      )
                    )
                  ) : (
                    <Badge className="bg-gray-300 text-gray-900">
                      <Beer className="mr-1 w-3 h-3 sm:w-4 sm:h-4" />
                      Venta en barra
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">Cliente:</Label>
                <span className="text-xs sm:text-sm">
                  {selectedVenta.cliente_nombre || "Sin cliente"}
                </span>
              </div>
              {hasAnfitrionas && (
                <>
                  <div className="flex items-center gap-2">
                    <Home className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                    <Label className="text-xs sm:text-sm font-medium">
                      Habitación:
                    </Label>
                    <span className="text-xs sm:text-sm">
                      {selectedVenta.habitacion_numero ||
                        "Sin habitación"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                    <Label className="text-xs sm:text-sm font-medium">
                      Comisión:
                    </Label>
                    <span className="text-xs sm:text-sm">
                      $
                      {(Array.isArray(selectedVenta.detalles)
                        ? selectedVenta.detalles.reduce(
                            (sum, detalle) =>
                              sum + (detalle.comision || 0),
                            0
                          )
                        : 0
                      ).toLocaleString()}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <DollarSign className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">Propina:</Label>
                <span className="text-xs sm:text-sm">
                  ${(selectedVenta.propina || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="text-gray-500 w-3 h-3 sm:w-4 sm:h-4" />
                <Label className="text-xs sm:text-sm font-medium">
                  Método de pago:
                </Label>
                <span className="text-xs sm:text-sm">
                  {metodoPagoLabels[
                    selectedVenta.metodo_pago as keyof typeof metodoPagoLabels
                  ] || "No especificado"}
                </span>
              </div>
            </div>
          </div>

          {/* Detalle de productos */}
          <div className="border-t pt-4">
            <h3 className="text-base sm:text-lg font-semibold text-center mb-4">
              Detalle de Productos
            </h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">PRODUCTO</TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">
                      CANTIDAD
                    </TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">PRECIO</TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">
                      SUB TOTAL
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(selectedVenta.detalles) &&
                  selectedVenta.detalles.length > 0 ? (
                    selectedVenta.detalles.map(
                      (detalle: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="font-medium">
                              {detalle.producto_nombre ||
                                `Producto ID: ${detalle.producto_id}` ||
                                "Producto sin nombre"}
                            </div>
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm">
                            {detalle.cantidad || 0}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            ${(detalle.precio || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right text-xs sm:text-sm">
                            ${(detalle.sub_total || 0).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      )
                    )
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-gray-500 text-xs sm:text-sm"
                      >
                        No hay detalles de productos disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Totales */}
          <div className="border-t pt-4">
            <div className="flex justify-end">
              <div className="text-right space-y-2">
                <div className="text-xs sm:text-sm">
                  <span>SUB TOTAL:</span>{" "}
                  <span>
                    $
                    {(Array.isArray(selectedVenta.detalles)
                      ? selectedVenta.detalles.reduce(
                          (sum, detalle) =>
                            sum + (detalle.sub_total || 0),
                          0
                        )
                      : 0
                    ).toLocaleString()}
                  </span>
                </div>
                <div className="text-base sm:text-lg font-bold">
                  <span>TOTAL:</span>{" "}
                  <span>
                    ${(selectedVenta.total || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Botón cerrar */}
          <div className="flex justify-center pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="outline"
              className="rounded-full px-4 sm:px-6 bg-black text-white hover:scale-110 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
