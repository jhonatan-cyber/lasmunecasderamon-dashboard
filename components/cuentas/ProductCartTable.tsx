import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ProductoCarrito {
  id_producto: number;
  nombre: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  categoria_nombre: string;
}

interface ProductCartTableProps {
  productos: ProductoCarrito[];
  onUpdateQuantity: (index: number, newQuantity: number) => void;
  onRemove: (index: number) => void;
}

function ProductCartTableComponent({
  productos,
  onUpdateQuantity,
  onRemove,
}: ProductCartTableProps) {
  if (productos.length === 0) {
    return (
      <div className="rounded-lg p-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PRODUCTO</TableHead>
              <TableHead className="text-center">CANTIDAD</TableHead>
              <TableHead className="text-center">PRECIO</TableHead>
              <TableHead className="text-center">COMISIÓN</TableHead>
              <TableHead className="text-center">SUB TOTAL</TableHead>
              <TableHead className="text-center">ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                No hay productos agregados
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg p-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>PRODUCTO</TableHead>
            <TableHead className="text-center">CANTIDAD</TableHead>
            <TableHead className="text-center">PRECIO</TableHead>
            <TableHead className="text-center">COMISIÓN</TableHead>
            <TableHead className="text-center">SUB TOTAL</TableHead>
            <TableHead className="text-center">ACCIONES</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {productos.map((producto, index) => (
            <TableRow key={producto.id_producto}>
              <TableCell>
                <div>
                  <div className="font-medium">{producto.nombre}</div>
                  <div className="text-xs text-gray-500">
                    {producto.categoria_nombre}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateQuantity(index, producto.cantidad - 1)}
                    className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-8 text-center">{producto.cantidad}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateQuantity(index, producto.cantidad + 1)}
                    className="w-6 h-6 p-0 rounded-full hover:scale-105 transition-all duration-200"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-center">
                {formatCurrencyNoDecimals(producto.precio)}
              </TableCell>
              <TableCell className="text-center">
                {formatCurrencyNoDecimals(Math.round(producto.sub_total * 0.25))}
              </TableCell>
              <TableCell className="text-center">
                {formatCurrencyNoDecimals(producto.sub_total)}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => onRemove(index)}
                  className="rounded-full text-red-600 hover:text-red-700 hover:scale-105 transition-all duration-200"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export const ProductCartTable = memo(ProductCartTableComponent);
