'use client';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from '@/components/ui/table';

import { Minus, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrencyCLP } from '@/lib/utils/formatters';

interface Producto {
  id_producto?: string | number;
  id?: string | number;
  nombre?: string;
  name?: string;
  product_name?: string;
  categoria?: string;
  cantidad?: number;
  precio?: number;
  price?: number;
  comision?: number;
  commission?: number;
  subtotal?: number;
}

interface ProductTableProps {
  productos: Producto[];
  onCantidadChange: (index: number, nuevaCantidad: number) => void;
  onRemoveProducto: (index: number) => void;
}

export default function ProductTable({
  productos,
  onCantidadChange,
  onRemoveProducto
}: ProductTableProps) {
  return (
    <div className='bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-3xl border-none shadow-md overflow-hidden'>
      <div className='overflow-x-auto'>
        <Table className='min-w-full w-full'>
          <TableHeader>
            <TableRow>
              <TableHead className='text-left font-bold'>PRODUCTO</TableHead>
              <TableHead className='text-left font-bold'>CANTIDAD</TableHead>
              <TableHead className='text-left font-bold'>PRECIO</TableHead>
              <TableHead className='text-left font-bold'>COMISIÓN</TableHead>
              <TableHead className='text-left font-bold'>SUB TOTAL</TableHead>
              <TableHead className='text-left font-bold'>ACCIONES</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.isArray(productos) && productos.length > 0 ? (
              productos.map((producto, index) => (
                <TableRow key={index} className='border-b transition-colors'>
                  <TableCell>
                    <div className='flex flex-col gap-1'>
                      <span className='font-medium text-sm'>
                        {producto.nombre || producto.name || producto.product_name || 'Sin nombre'}
                      </span>
                      <span className='inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400 w-fit'>
                        {producto.categoria}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className='flex items-center gap-1'>
                      <Button
                        variant='outline'
                        size='icon'
                        aria-label='Disminuir'
                        className='h-7 w-7 rounded-full bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-slate-700'
                        onClick={() =>
                          onCantidadChange(index, Math.max(1, (producto.cantidad || 1) - 1))
                        }
                      >
                        <Minus className='h-3 w-3' />
                      </Button>
                      <span className='w-8 text-center text-sm font-medium'>
                        {producto.cantidad || 1}
                      </span>
                      <Button
                        variant='outline'
                        size='icon'
                        aria-label='Aumentar'
                        className='h-7 w-7 rounded-full bg-gray-100 dark:bg-slate-800 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-slate-700'
                        onClick={() => onCantidadChange(index, (producto.cantidad || 1) + 1)}
                      >
                        <Plus className='h-3 w-3' />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrencyCLP(producto.precio || producto.price || 0)}</TableCell>
                  <TableCell>
                    {formatCurrencyCLP(producto.commission || producto.comision || 0)}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {formatCurrencyCLP(producto.subtotal || 0)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant='ghost'
                      size='sm'
                      aria-label='Eliminar'
                      onClick={() => onRemoveProducto(index)}
                      className='h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors'
                    >
                      <Trash className='h-4 w-4' />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className='text-center'>
                  No hay productos agregados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
