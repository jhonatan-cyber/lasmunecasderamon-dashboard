/* eslint-disable */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Trash2, Package } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/formatters";

interface ProductSummaryCardProps {
  selectedProducts: {[key: string]: number};
  productos: any[];
  onRemoveProduct: (id: string) => void;
  onAddAllSelected: () => void;
  onClearSelection: () => void;
}

export default function ProductSummaryCard({
  selectedProducts,
  productos,
  onRemoveProduct,
  onAddAllSelected,
  onClearSelection,
}: ProductSummaryCardProps) {
  const selectedEntries = Object.entries(selectedProducts);
  
  if (selectedEntries.length === 0) {
    return null;
  }

  const getTotalValue = () => {
    return selectedEntries.reduce((sum, [id, cantidad]) => {
      const producto = productos?.find(p => (p.id_producto || p.id).toString() === id);
      if (producto) {
        return sum + (producto.precio || producto.price || 0) * cantidad;
      }
      return sum;
    }, 0);
  };

  const getTotalQuantity = () => {
    return selectedEntries.reduce((sum, [, cantidad]) => sum + cantidad, 0);
  };

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-blue-600" />
          Productos Seleccionados
          <Badge variant="secondary" className="ml-auto">
            {selectedEntries.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Lista de productos seleccionados */}
        <div className="max-h-32 overflow-y-auto space-y-2">
          {selectedEntries.map(([id, cantidad]) => {
            const producto = productos?.find(p => (p.id_producto || p.id).toString() === id);
            if (!producto) return null;
            
            return (
              <div key={id} className="flex items-center justify-between text-xs bg-white rounded p-2">
                <div className="flex-1">
                  <div className="font-medium truncate">
                    {producto.nombre || producto.name}
                  </div>
                  <div className="text-gray-500">
                    {cantidad} × {formatCurrencyNoDecimals(producto.precio || producto.price)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-green-600">
                    {formatCurrencyNoDecimals((producto.precio || producto.price) * cantidad)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveProduct(id)}
                    className="w-6 h-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Resumen total */}
        <div className="border-t pt-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total productos:</span>
            <span className="font-medium">{getTotalQuantity()}</span>
          </div>
          <div className="flex justify-between text-sm font-medium">
            <span>Valor total:</span>
            <span className="text-green-600">
              {formatCurrencyNoDecimals(getTotalValue())}
            </span>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={onAddAllSelected}
            size="sm"
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ShoppingCart className="w-3 h-3 mr-1" />
            Agregar Todos
          </Button>
          <Button
            onClick={onClearSelection}
            size="sm"
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
