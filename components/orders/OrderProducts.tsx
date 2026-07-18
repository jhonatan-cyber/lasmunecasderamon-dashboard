'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { formatCurrencyCLP } from '@/lib/utils/formatters';
import { OrderDetailTotalsSummary } from '@/components/orders/detail';

interface OrderProductsProps {
  detail: any[];
  propina: number;
  recargoAnfitrionas: number;
}

export function OrderProducts({ detail, propina, recargoAnfitrionas }: OrderProductsProps) {
  return (
    <div className="bg-white dark:bg-slate-900/40 backdrop-blur-xs rounded-2xl border-none shadow-md overflow-hidden">
      <Table>
        <TableHeader className="bg-gray-100 dark:bg-slate-900/50">
          <TableRow className="hover:bg-transparent border-gray-100 dark:border-gray-800">
            <TableHead className="py-4 px-5 text-xs uppercase text-gray-500 text-left">
              Bebida
            </TableHead>
            <TableHead className="py-4 px-5 text-xs uppercase text-gray-500 text-center">
              Cantidad
            </TableHead>
            <TableHead className="py-4 px-5 text-xs uppercase text-gray-500 text-center">
              Precio
            </TableHead>
            <TableHead className="py-4 px-5 text-xs uppercase text-gray-500 text-center">
              Comisión
            </TableHead>
            <TableHead className="py-4 px-5 text-xs uppercase text-gray-500 text-right">
              Sub Total
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {detail.map((item: any, idx: number) => (
            <TableRow
              key={idx}
              className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-slate-800/30 ${
                idx === 0 ? 'first:rounded-t-xl' : ''
              } ${idx === detail.length - 1 ? 'last:rounded-b-xl' : ''}`}
            >
              <TableCell className="py-3 px-4 text-left font-medium">
                {item.producto_nombre}
              </TableCell>
              <TableCell className="py-3 px-4 text-center">{item.cantidad}</TableCell>
              <TableCell className="py-3 px-4 text-center">
                {formatCurrencyCLP(item.precio)}
              </TableCell>
              <TableCell className="py-3 px-4 text-center">
                {formatCurrencyCLP(item.comision)}
              </TableCell>
              <TableCell className="py-3 px-4 text-right font-medium">
                {formatCurrencyCLP(item.subtotal)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Separator className="my-4" />

      <OrderDetailTotalsSummary
        subtotal={detail[0]?.total || 0}
        propina={propina}
        recargoAnfitrionas={recargoAnfitrionas}
        total={(detail[0]?.total || 0) + propina + recargoAnfitrionas}
      />
    </div>
  );
}
