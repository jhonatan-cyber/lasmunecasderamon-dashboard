import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash } from "@fortawesome/free-solid-svg-icons";
import { formatCurrency } from "@/lib/formatters";

interface CartProduct {
  id_producto?: number;
  id?: number;
  nombre?: string;
  name?: string;
  cantidad: number;
  precio?: number;
  price?: number;
  subtotal: number;
}

interface CartProductTableProps {
  productos: CartProduct[];
  onRemoveProducto?: (index: number) => void;
  onCantidadChange?: (index: number, nuevaCantidad: number) => void;
  showTotales?: boolean;
}

const CartProductTable: React.FC<CartProductTableProps> = ({
  productos = [],
  onRemoveProducto,
  onCantidadChange,
  showTotales = true,
}) => {
  const subtotal = Array.isArray(productos)
    ? productos.reduce((acc, p) => acc + (p?.subtotal || 0), 0)
    : 0;

  return (
    <div className="overflow-x-auto w-full mt-6">
      <table className="min-w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr>
            <th className="text-center font-medium text-gray-500 pb-2">PRODUCTO</th>
            <th className="text-center font-medium text-gray-500 pb-2">CANTIDAD</th>
            <th className="text-center font-medium text-gray-500 pb-2">PRECIO</th>
            <th className="text-center font-medium text-gray-500 pb-2">SUB TOTAL</th>
            <th className="text-center font-medium text-gray-500 pb-2">ELIMINAR</th>
          </tr>
        </thead>
        <tbody>
          {(!Array.isArray(productos) || productos.length === 0) && (
            <tr>
              <td colSpan={5} className="text-center text-gray-300 py-6">
                No hay productos agregados
              </td>
            </tr>
          )}
          {Array.isArray(productos) && productos.map((p, idx) => (
            <tr key={p.id_producto || p.id || idx}>
              <td className="text-center">{p.nombre || p.name || "Sin nombre"}</td>
              <td className="text-center">
                {onCantidadChange ? (
                  <Input
                    type="number"
                    value={p.cantidad}
                    onChange={e => onCantidadChange(idx, parseInt(e.target.value) || 0)}
                    min="1"
                    className="w-20 mx-auto"
                  />
                ) : (
                  p.cantidad
                )}
              </td>
              <td className="text-center">{formatCurrency(p.precio ?? p.price ?? 0)}</td>
              <td className="text-center">{formatCurrency(p.subtotal)}</td>
              <td className="text-center">
                {onRemoveProducto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveProducto(idx)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {showTotales && (
          <tfoot>
            <tr>
              <td colSpan={3}></td>
              <td className="text-right font-bold">Subtotal:</td>
              <td className="text-center font-bold">{formatCurrency(subtotal)}</td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default CartProductTable; 