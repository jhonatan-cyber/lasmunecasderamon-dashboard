import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus} from "lucide-react";
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
  hostessOptions?: { id: string; name: string }[];
  onAssignHostess?: (index: number, hostessId: string) => void;
  hasChampagne?: boolean;
  selectedHostesses?: { id: string; name: string }[];
}

export default function OrderProductTable({
  productos,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  hostessOptions = [],
  onAssignHostess,
  hasChampagne = false,
  selectedHostesses = [],
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
              <td colSpan={7} className="text-center text-gray-300 py-6">
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
                    
                    // Si no hay champaña en el pedido, no mostrar selector (comisión se reparte)
                    if (!hasChampagne) {
                      return (
                        <div className="flex flex-row flex-wrap gap-1 items-center justify-center">
                          {selectedHostesses.length > 0 ? (
                            selectedHostesses.map((h, idx) => (
                              <span 
                                key={h.id}
                                className={`${badgeColors[idx % badgeColors.length]} px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap`}
                              >
                                {h.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">Comisión repartida</span>
                          )}
                        </div>
                      );
                    }
                    
                    // Si este producto es champaña, mostrar solo anfitrionas no asignadas a otros tragos
                    if (isChampagne) {
                      const assignedHostessIds = productos
                        .filter((_, i) => i !== idx)
                        .map((item) => item.hostessId)
                        .filter(Boolean);
                      
                      const availableHostesses = selectedHostesses.filter(
                        (h) => !assignedHostessIds.includes(h.id)
                      );
                      
                      return (
                        <div className="flex flex-row flex-wrap gap-1 items-center justify-center">
                          {availableHostesses.length > 0 ? (
                            availableHostesses.map((h, idx) => (
                              <span 
                                key={h.id}
                                className={`${badgeColors[idx % badgeColors.length]} px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap`}
                              >
                                {h.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-xs">Sin anfitrionas disponibles</span>
                          )}
                        </div>
                      );
                    }
                    
                    // Producto con comisión cuando hay champaña: asignación opcional
                    const usedHostessIds = productos
                      .filter((_, i) => i !== idx)
                      .map((item) => item.hostessId)
                      .filter(Boolean);
                    
                    return (
                      <div className="flex flex-col items-center gap-1">
                        <select
                          className="border rounded-full px-3 py-1 text-sm bg-white"
                          value={p.hostessId || ""}
                          onChange={(e) => onAssignHostess?.(idx, e.target.value)}
                        >
                          <option value="">Repartir entre todas</option>
                          {hostessOptions.map((h) => (
                            <option
                              key={h.id}
                              value={h.id}
                              disabled={h.id !== p.hostessId && usedHostessIds.includes(h.id)}
                            >
                              {h.name}
                            </option>
                          ))}
                        </select>
                        {!p.hostessId && (
                          <span className="text-xs text-gray-400">Se reparte</span>
                        )}
                      </div>
                    );
                  })()
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
