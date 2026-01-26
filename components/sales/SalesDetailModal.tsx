import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VentaWithDetails } from "@/types/venta";

interface SalesDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVenta: VentaWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
}

function formatFecha(fechaStr?: string) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  }
  const [fecha] = fechaStr.split(' ');
  if (!fecha) return '-';
  const [y, m, d] = fecha.split('-');
  return `${d}-${m}-${y}`;
}

function formatHora(fechaStr?: string) {
  if (!fechaStr) return '-';
  if (fechaStr.includes('T')) {
    const date = new Date(fechaStr);
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${min}`;
  }
  const parts = fechaStr.split(' ');
  if (parts[1]) {
    const [h, m] = parts[1].split(':');
    return `${h}:${m}`;
  }
  return '-';
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
  const totalComision = Array.isArray(selectedVenta.detalles)
    ? selectedVenta.detalles.reduce((sum, detalle) => sum + (detalle.comision || 0), 0)
    : 0;
  const subTotal = Array.isArray(selectedVenta.detalles)
    ? selectedVenta.detalles.reduce((sum, detalle) => sum + (detalle.sub_total || 0), 0)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:w-[56rem] sm:max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b flex-shrink-0">
          <DialogTitle className="text-lg sm:text-xl">
            Detalles de la Venta - {selectedVenta.codigo || 'Sin código'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          <div className="space-y-6">
            {/* Info general */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Columna izquierda - Información de la venta */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Fecha y Hora:</span>
                  <div className="text-xs sm:text-sm font-medium">
                    <div>{formatFecha(selectedVenta.fecha_crea)}</div>
                    <div>{formatHora(selectedVenta.fecha_crea)}</div>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Código:</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedVenta.codigo || 'Sin código'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Cliente:</span>
                  <span className="text-xs sm:text-sm font-medium">
                    {selectedVenta.cliente_nombre || 'Sin cliente'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Anfitriona(s):</span>
                  <div className="flex flex-wrap gap-1 justify-end">
                    {hasAnfitrionas ? (
                      selectedVenta.usuarios.map((usuario: any, index: number) => (
                        <Badge
                          key={usuario.id || index}
                          className={anfitrionaColors[index % anfitrionaColors.length]}
                        >
                          {usuario.nick || usuario.usuario_nombre || 'Sin nick'}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="secondary">Venta en barra</Badge>
                    )}
                  </div>
                </div>
                {selectedVenta.garzon_nombre && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-muted-foreground">Garzón:</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {selectedVenta.garzon_nombre}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Columna derecha - Información de pago */}
              <div className="space-y-3">
                {hasAnfitrionas && selectedVenta.habitacion_numero && (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-muted-foreground">Habitación:</span>
                      <span className="text-xs sm:text-sm font-medium">
                        {selectedVenta.habitacion_numero}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Método de Pago:</span>
                  <Badge variant="outline" className="text-xs">
                    {metodoPagoLabels[selectedVenta.metodo_pago as keyof typeof metodoPagoLabels] || 'No especificado'}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">Propina:</span>
                  <span className="text-xs sm:text-sm font-medium">
                    ${(selectedVenta.propina || 0).toLocaleString('es-CL')}
                  </span>
                </div>
                {hasAnfitrionas && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm text-muted-foreground">Total Comisión:</span>
                      <span className="text-xs sm:text-sm font-semibold">
                        ${totalComision.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Tabla de productos */}
            <div className="border rounded-lg p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-left">Producto</TableHead>
                    <TableHead className="text-center">Tipo</TableHead>
                    <TableHead className="text-center">Cantidad</TableHead>
                    <TableHead className="text-center">Precio</TableHead>
                    <TableHead className="text-center">Comisión</TableHead>
                    <TableHead className="text-right">Sub Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.isArray(selectedVenta.detalles) && selectedVenta.detalles.length > 0 ? (
                    selectedVenta.detalles.map((detalle: any, index: number) => {
                      const tieneComision = (detalle.comision || 0) > 0;
                      return (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {detalle.producto_nombre || `Producto ID: ${detalle.producto_id}` || 'Sin nombre'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant={tieneComision ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {tieneComision ? 'Anfitriona' : 'Cliente'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{detalle.cantidad || 0}</TableCell>
                          <TableCell className="text-center">
                            ${(detalle.precio || 0).toLocaleString('es-CL')}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={tieneComision ? 'text-green-600 font-semibold' : ''}>
                              ${(detalle.comision || 0).toLocaleString('es-CL')}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${(detalle.sub_total || 0).toLocaleString('es-CL')}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No hay detalles de productos disponibles
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              {/* Resumen de totales */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">SUBTOTAL:</span>
                  <span className="font-semibold">${subTotal.toLocaleString('es-CL')}</span>
                </div>
                {selectedVenta.propina && selectedVenta.propina > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">+ Propina:</span>
                    <span className="text-blue-600 font-medium">
                      ${selectedVenta.propina.toLocaleString('es-CL')}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between items-center text-base">
                  <span className="font-bold">TOTAL:</span>
                  <span className="font-bold text-lg">
                    ${(selectedVenta.total || 0).toLocaleString('es-CL')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer con botón - fijo en la parte inferior */}
        <div className="flex-shrink-0 border-t px-4 sm:px-6 py-4 bg-white">
          <div className="flex justify-center">
            <Button
              onClick={() => onOpenChange(false)}
              size="sm"
              variant="outline"
              className="rounded-full px-6 hover:scale-105 transition-all duration-200 hover:bg-black hover:text-white"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
