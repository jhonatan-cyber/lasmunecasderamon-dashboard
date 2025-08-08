import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface OrderProductTableProps {
  productos: any[];
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
}

export default function OrderProductTable({
  productos,
  onRemoveProducto,
  onUpdateCantidad,
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
              <td colSpan={5} className="text-center text-gray-300 py-6">
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
              <td className="text-center">{formatCurrencyNoDecimals(p.subtotal)}</td>
              <td className="text-center">
                <Button
                  variant="outline"
                  className="rounded-full px-6 bg-red-500 text-white hover:scale-110 transition-all duration-200"
                  size="icon"
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
