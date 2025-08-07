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
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCalendar,
  faClock,
  faTag,
  faUser,
  faMoneyBill,
  faDollarSign,
  faCreditCard,
  faHome,
  faBeer,
} from "@fortawesome/free-solid-svg-icons";
import { ServicioWithDetails } from "@/types/servicio";
import { formatCurrency } from "@/lib/salesUtils";

interface ServicioDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedServicio: ServicioWithDetails | null;
  anfitrionaColors: string[];
  metodoPagoLabels: Record<string, string>;
}

export function ServicioDetailModal({
  open,
  onOpenChange,
  selectedServicio,
  anfitrionaColors,
  metodoPagoLabels,
}: ServicioDetailModalProps) {
  if (!selectedServicio) return null;

  const hasAnfitrionas = selectedServicio.anfitrionas_nombres && selectedServicio.anfitrionas_nombres.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-bold mb-5">
            Información del Servicio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faCalendar}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Fecha:</Label>
                <span className="text-sm">
                  {selectedServicio.fecha_crea
                    ? new Date(
                        selectedServicio.fecha_crea
                      ).toLocaleDateString("es-ES")
                    : "Sin fecha"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faClock}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Hora:</Label>
                <span className="text-sm">
                  {selectedServicio.fecha_crea
                    ? new Date(
                        selectedServicio.fecha_crea
                      ).toLocaleTimeString("es-ES", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "Sin hora"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faTag}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Código:</Label>
                <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                  {selectedServicio.codigo}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faUser}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Cliente:</Label>
                <span className="text-sm">
                  {selectedServicio.cliente_nombre || "Sin cliente"}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faHome}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Habitación:</Label>
                <span className="text-sm">
                  {selectedServicio.habitacion_numero || "Sin habitación"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faClock}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Tiempo:</Label>
                <span className="text-sm">
                  {selectedServicio.tiempo} minutos
                </span>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faCreditCard}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Método de Pago:</Label>
                <Badge variant="outline" className="text-xs">
                  {selectedServicio.metodo_pago
                    ? metodoPagoLabels[selectedServicio.metodo_pago] ||
                      selectedServicio.metodo_pago
                    : "No especificado"}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <FontAwesomeIcon
                  icon={faUser}
                  className="text-gray-500 w-4"
                />
                <Label className="text-sm font-medium">Total Usuarios:</Label>
                <span className="text-sm">
                  {selectedServicio.total_usuarios || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Anfitrionas */}
          {hasAnfitrionas && (
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FontAwesomeIcon icon={faUser} className="text-gray-500 w-4" />
                Anfitrionas:
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedServicio.anfitrionas_nombres?.split(',').map((anfitriona, index) => (
                  <Badge
                    key={index}
                    className="text-xs"
                    style={{
                      backgroundColor: anfitrionaColors[index % anfitrionaColors.length],
                      color: 'white'
                    }}
                  >
                    {anfitriona.trim()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

                     {/* Información financiera */}
           <div className="space-y-3">
             <Label className="text-sm font-medium flex items-center gap-2">
               <FontAwesomeIcon icon={faMoneyBill} className="text-gray-500 w-4" />
               Información Financiera:
             </Label>
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Concepto</TableHead>
                   <TableHead className="text-right">Monto</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 <TableRow>
                   <TableCell>Precio Habitación</TableCell>
                   <TableCell className="text-right">
                     {formatCurrency(selectedServicio.precio_habitacion)}
                   </TableCell>
                 </TableRow>
                 <TableRow>
                   <TableCell>Precio Servicio</TableCell>
                   <TableCell className="text-right">
                     {formatCurrency(selectedServicio.precio_servicio)}
                   </TableCell>
                 </TableRow>
                 <TableRow>
                   <TableCell>IVA</TableCell>
                   <TableCell className="text-right">
                     {formatCurrency(selectedServicio.iva)}
                   </TableCell>
                 </TableRow>
                 <TableRow className="font-semibold">
                   <TableCell>Subtotal</TableCell>
                   <TableCell className="text-right">
                     {formatCurrency(selectedServicio.sub_total)}
                   </TableCell>
                 </TableRow>
                 <TableRow className="font-bold bg-gray-50">
                   <TableCell>Total</TableCell>
                   <TableCell className="text-right text-lg">
                     {formatCurrency(selectedServicio.total)}
                   </TableCell>
                 </TableRow>
               </TableBody>
             </Table>
           </div>

           {/* Información adicional */}
           <div className="grid grid-cols-2 gap-6">
             <div className="space-y-3">
               <Label className="text-sm font-medium flex items-center gap-2">
                 <FontAwesomeIcon icon={faClock} className="text-gray-500 w-4" />
                 Detalles del Servicio:
               </Label>
               <div className="bg-blue-50 p-4 rounded-lg space-y-2">
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">Tiempo del servicio:</span>
                   <span className="text-sm font-medium">{selectedServicio.tiempo} minutos</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">Total usuarios:</span>
                   <span className="text-sm font-medium">{selectedServicio.total_usuarios || 0}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">Cliente ID:</span>
                   <span className="text-sm font-medium">{selectedServicio.cliente_id}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">Habitación ID:</span>
                   <span className="text-sm font-medium">{selectedServicio.habitacion_id}</span>
                 </div>
               </div>
             </div>

             <div className="space-y-3">
               <Label className="text-sm font-medium flex items-center gap-2">
                 <FontAwesomeIcon icon={faTag} className="text-gray-500 w-4" />
                 Información del Sistema:
               </Label>
               <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">ID del servicio:</span>
                   <span className="text-sm font-medium">{selectedServicio.id_servicio}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">Código:</span>
                   <span className="text-sm font-medium font-mono">{selectedServicio.codigo}</span>
                 </div>
                 <div className="flex justify-between">
                   <span className="text-sm text-gray-600">Estado:</span>
                   <Badge
                     variant={selectedServicio.estado === 1 ? "default" : "secondary"}
                     className={selectedServicio.estado === 1 ? "bg-green-500" : "bg-gray-500"}
                   >
                     {selectedServicio.estado === 1 ? "Activo" : "Inactivo"}
                   </Badge>
                 </div>
               </div>
             </div>
                      </div>
         </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
} 