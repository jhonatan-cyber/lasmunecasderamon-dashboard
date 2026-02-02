import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface OrderProductTableProps {
  productos: any[];
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void;
  onAssignHostess?: (index: number, hostessId: string) => void;
  anfitrionas: any[]; // Lista de anfitrionas para mostrar nombres
  habitaciones?: any[]; // Lista de habitaciones para mostrar nombres
}

export default function OrderProductTable({
  productos,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onAssignHostess,
  anfitrionas,
  habitaciones = [],
}: OrderProductTableProps) {
  return (
    <div className="overflow-x-auto w-full mt-10">
      <table className="min-w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-center font-medium text-gray-500 pb-2">
              PRODUCTO
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              CANTIDAD
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              PRECIO
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              TIPO
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              COMISIÓN
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              ANFITRIONA ASIGNADA
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              HABITACIÓN
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              SUB TOTAL
            </th>
            <th className="text-center font-medium text-gray-500 pb-2">
              ELIMINAR
            </th>
          </tr>
        </thead>
        <tbody>
          {productos.length === 0 && (
            <tr>
              <td colSpan={9} className="text-center text-gray-300 py-6">
                No hay productos agregados
              </td>
            </tr>
          )}
          {productos.map((p, idx) => (
            <tr key={idx}>
              <td className="text-center">{p.nombre || p.name}</td>
              <td className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (p.cantidad > 1 && onUpdateCantidad) {
                        onUpdateCantidad(idx, p.cantidad - 1);
                      }
                    }}
                    className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                    disabled={p.cantidad <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center font-medium">
                    {p.cantidad}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (onUpdateCantidad) {
                        onUpdateCantidad(idx, p.cantidad + 1);
                      }
                    }}
                    className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </td>
              <td className="text-center">{formatCurrencyNoDecimals(p.precio || p.price)}</td>
              <td className="text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onToggleComision?.(idx)}
                        className={`rounded-full px-1.5 py-0 text-[10px] h-5 transition-all duration-200 ${p.generaComision === 0
                          ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
                          : 'bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200'
                          }`}
                      >
                        {p.generaComision === 0 ? 'Cliente' : 'Anfitriona'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="text-xs">
                        {p.generaComision === 0
                          ? 'Para el cliente (sin comisión)'
                          : 'Para las Anfitriona (con comisión)'}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </td>
              <td className="text-center">
                {p.generaComision === 1 && p.comision > 0 ? (
                  <span className="text-green-600 font-medium">
                    {formatCurrencyNoDecimals(p.comision)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="text-center">
                {p.generaComision === 1 ? (
                  (() => {
                    const badgeColors = [
                      "bg-purple-100 text-purple-700",
                      "bg-pink-100 text-pink-700",
                      "bg-blue-100 text-blue-700",
                      "bg-green-100 text-green-700",
                      "bg-yellow-100 text-yellow-700",
                      "bg-red-100 text-red-700",
                      "bg-indigo-100 text-indigo-700",
                      "bg-cyan-100 text-cyan-700",
                    ];

                    const isChampagne = (p.categoria || p.category_name || "").toLowerCase().includes("champ");

                    // Si el producto tiene anfitrionas específicamente asignadas
                    if (p.selectedHostesses && p.selectedHostesses.length > 0) {
                      return (
                        <div className="flex flex-row flex-wrap gap-1 items-center justify-center">

                          {p.selectedHostesses.map((hostessId: string, idx: number) => {
                            // Buscar el nombre de la anfitriona por ID
                            const anfitriona = anfitrionas.find(a =>
                              String(a.id || a.id_usuario) === hostessId
                            );
                            const hostessName = anfitriona ?
                              (anfitriona.nick || anfitriona.name || anfitriona.nombre || `ID: ${hostessId}`) :
                              `ID: ${hostessId}`;

                            return (
                              <span
                                key={hostessId}
                                className={`${badgeColors[idx % badgeColors.length]} px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap`}
                              >
                                {hostessName}
                              </span>
                            );
                          })}
                        </div>
                      );
                    }

                    return (
                      <span className="text-gray-400 text-xs">Sin anfitrionas asignadas</span>
                    );
                  })()
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="text-center">
                {p.selectedRoom ? (
                  (() => {
                    // Buscar el nombre de la habitación por ID
                    const habitacion = habitaciones.find(h =>
                      String(h.id_habitacion || h.id) === String(p.selectedRoom)
                    );
                    const roomName = habitacion ?
                      (habitacion.nombre || habitacion.name || `Habitación ${p.selectedRoom}`) :
                      `ID: ${p.selectedRoom}`;

                    return (
                      <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-medium">
                        {roomName}
                      </span>
                    );
                  })()
                ) : p.requiresRoom ? (
                  <span className="text-red-500 text-xs">Requerida</span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="text-center">{formatCurrencyNoDecimals(p.subtotal)}</td>
              <td className="text-center">
                <Button
                  variant="outline"
                  className="rounded-full w-7 h-7 p-0 bg-red-500 text-white hover:bg-red-600 hover:scale-110 transition-all duration-200"
                  onClick={() => onRemoveProducto?.(idx)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}