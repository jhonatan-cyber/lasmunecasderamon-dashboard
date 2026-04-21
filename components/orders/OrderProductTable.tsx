/* eslint-disable */
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus } from "lucide-react";
import { formatCurrencyNoDecimals } from "@/lib/utils/formatters";
import { memo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  anfitrionas: any[];
  habitaciones?: any[];
}

const ProductRow = memo(({
  producto,
  index,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  anfitrionas,
  habitaciones,
}: {
  producto: any;
  index: number;
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void;
  anfitrionas: any[];
  habitaciones: any[];
}) => {
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

  return (
    <TableRow className="border-b bg-white transition-colors hover:bg-gray-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-800/30">
      <TableCell className="px-3 py-3 text-center font-medium text-gray-800 dark:text-gray-100">
        {producto.nombre || producto.name}
      </TableCell>
      <TableCell className="px-3 py-3 text-center">
        <div className="flex items-center justify-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (producto.cantidad > 1 && onUpdateCantidad) {
                onUpdateCantidad(index, producto.cantidad - 1);
              }
            }}
            className="h-6 w-6 rounded-full p-0 transition-all duration-200 hover:scale-105"
            disabled={producto.cantidad <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-8 text-center font-medium text-gray-700 dark:text-gray-200">
            {producto.cantidad}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (onUpdateCantidad) {
                onUpdateCantidad(index, producto.cantidad + 1);
              }
            }}
            className="h-6 w-6 rounded-full p-0 transition-all duration-200 hover:scale-105"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
      <TableCell className="px-3 py-3 text-center text-gray-700 dark:text-gray-200">
        {formatCurrencyNoDecimals(producto.precio || producto.price)}
      </TableCell>
      <TableCell className="px-3 py-3 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onToggleComision?.(index)}
                className={`h-6 rounded-full px-2 py-0 text-[10px] transition-all duration-200 ${producto.generaComision === 0
                  ? 'border-blue-300 bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'border-pink-300 bg-pink-100 text-pink-700 hover:bg-pink-200'
                  }`}
              >
                {producto.generaComision === 0 ? 'Cliente' : 'Anfitriona'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-xs">
                {producto.generaComision === 0
                  ? 'Para el cliente (sin comisión)'
                  : 'Para la anfitriona (con comisión)'}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </TableCell>
      <TableCell className="px-3 py-3 text-center">
        {producto.generaComision === 1 && producto.comision > 0 ? (
          <span className="font-medium text-green-600 dark:text-green-400">
            {formatCurrencyNoDecimals(producto.comision)}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-3 text-center">
        {producto.generaComision === 1 ? (
          producto.selectedHostesses && producto.selectedHostesses.length > 0 ? (
            <div className="flex flex-row flex-wrap items-center justify-center gap-1">
              {producto.selectedHostesses.map((hostessId: string, idx: number) => {
                const anfitriona = anfitrionas.find(a =>
                  String(a.id || a.id_usuario) === hostessId
                );
                const hostessName = anfitriona
                  ? (anfitriona.nick || anfitriona.name || anfitriona.nombre || `ID: ${hostessId}`)
                  : `ID: ${hostessId}`;

                return (
                  <span
                    key={hostessId}
                    className={`${badgeColors[idx % badgeColors.length]} whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium`}
                  >
                    {hostessName}
                  </span>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-gray-400">Sin anfitrionas asignadas</span>
          )
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-3 text-center">
        {producto.selectedRoom ? (
          (() => {
            const habitacion = habitaciones.find(h =>
              String(h.id_habitacion || h.id) === String(producto.selectedRoom)
            );
            const roomName = habitacion
              ? (habitacion.nombre || habitacion.name || `Habitación ${producto.selectedRoom}`)
              : `ID: ${producto.selectedRoom}`;

            return (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                {roomName}
              </span>
            );
          })()
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="px-3 py-3 text-center font-semibold text-gray-800 dark:text-gray-100">
        {formatCurrencyNoDecimals(producto.subtotal)}
      </TableCell>
      <TableCell className="px-3 py-3 text-center">
        <Button
          variant="outline"
          className="h-7 w-7 rounded-full bg-red-500 p-0 text-white transition-all duration-200 hover:scale-110 hover:bg-red-600"
          onClick={() => onRemoveProducto?.(index)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </TableCell>
    </TableRow>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.producto.cantidad === nextProps.producto.cantidad &&
    prevProps.producto.subtotal === nextProps.producto.subtotal &&
    prevProps.producto.generaComision === nextProps.producto.generaComision &&
    prevProps.producto.comision === nextProps.producto.comision &&
    JSON.stringify(prevProps.producto.selectedHostesses) === JSON.stringify(nextProps.producto.selectedHostesses) &&
    prevProps.producto.selectedRoom === nextProps.producto.selectedRoom
  );
});

const OrderProductTable = memo(function OrderProductTable({
  productos,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onAssignHostess,
  anfitrionas,
  habitaciones = [],
}: OrderProductTableProps) {
  return (
    <div className="mt-10 w-full overflow-x-auto">
      <div className="overflow-hidden rounded-3xl bg-white shadow-md dark:bg-slate-900/40 dark:shadow-black/20">
        <Table className="min-w-full text-sm text-center">
          <TableHeader className="border-b bg-gray-100 dark:border-slate-800 dark:bg-slate-900/50">
            <TableRow>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Producto
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Cantidad
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Precio
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Tipo
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Comisión
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Anfitriona asignada
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Habitación
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Sub total
              </TableHead>
              <TableHead className="px-3 py-3 text-center text-xs font-bold uppercase text-gray-600 dark:text-gray-300">
                Eliminar
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.length === 0 && (
              <TableRow className="bg-white dark:bg-slate-950/40">
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-sm text-gray-500 dark:text-gray-400"
                >
                  No hay productos agregados
                </TableCell>
              </TableRow>
            )}
            {productos.map((p, idx) => (
              <ProductRow
                key={`${p.id_producto || p.id}-${idx}`}
                producto={p}
                index={idx}
                onRemoveProducto={onRemoveProducto}
                onUpdateCantidad={onUpdateCantidad}
                onToggleComision={onToggleComision}
                anfitrionas={anfitrionas}
                habitaciones={habitaciones}
              />
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default OrderProductTable;
