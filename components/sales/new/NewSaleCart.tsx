import { Minus, Plus, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CELL_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_HEAD_CLASS,
  CUENTA_TABLE_HEADER_CLASS,
  CUENTA_TABLE_HEADER_ROW_CLASS,
  CUENTA_TABLE_ROW_CLASS
} from '@/components/cuentas/tables/cuentaTableStyles';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

interface NewSaleCartProps {
  productos: any[];
  anfitrionas: any[];
  handleCantidadChangeTable: (idx: number, newQty: number) => void;
  handleRemoveProducto: (idx: number) => void;
}

export const NewSaleCart = ({
  productos,
  anfitrionas,
  handleCantidadChangeTable,
  handleRemoveProducto
}: NewSaleCartProps) => {
  return (
    <div className={`mt-8 ${CUENTA_TABLE_CARD_CLASS}`}>
      <div className='bg-gray-50/50 py-3 px-6 border-b border-gray-100'>
        <div className='text-xs text-gray-500 font-bold uppercase tracking-widest'>
          Resumen de Productos
        </div>
      </div>
      <div className='overflow-x-auto'>
        <Table className={CUENTA_TABLE_CLASS}>
          <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
            <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
              <TableHead className={CUENTA_TABLE_HEAD_CLASS}>PRODUCTO</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>CANTIDAD</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>PRECIO</TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>
                ANFITRIONAS
              </TableHead>
              <TableHead className={`${CUENTA_TABLE_HEAD_CLASS} text-center`}>SUBTOTAL</TableHead>
              <TableHead className={CUENTA_TABLE_HEAD_CLASS}></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((p, i) => (
              <TableRow key={i} className={CUENTA_TABLE_ROW_CLASS}>
                <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                  <div className='font-medium text-gray-800'>{p.nombre}</div>
                  <div className='text-[10px] text-gray-400 uppercase'>{p.categoria}</div>
                </TableCell>
                <TableCell className={CUENTA_TABLE_CELL_CLASS}>
                  <div className='flex items-center justify-center gap-3'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleCantidadChangeTable(i, p.cantidad - 1)}
                      className='rounded-full w-7 h-7 p-0 border-gray-200 hover:bg-gray-100 hover:scale-110 transition-all'
                    >
                      <Minus className='w-3 h-3' />
                    </Button>
                    <span className='w-6 text-center font-bold text-gray-700'>{p.cantidad}</span>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={() => handleCantidadChangeTable(i, p.cantidad + 1)}
                      className='rounded-full w-7 h-7 p-0 border-gray-200 hover:bg-gray-100 hover:scale-110 transition-all'
                    >
                      <Plus className='w-3 h-3' />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center text-gray-600`}>
                  {formatCurrencyNoDecimals(p.precio)}
                </TableCell>
                <TableCell
                  className={`${CUENTA_TABLE_CELL_CLASS} text-center text-[11px] leading-tight text-gray-500 max-w-[150px]`}
                >
                  {p.selectedHostesses
                    ?.map(
                      (id: any) => anfitrionas.find(a => String(a.id || a.id_usuario) === id)?.nick
                    )
                    .filter(Boolean)
                    .join(', ') || <span className='text-gray-300 italic'>N/A</span>}
                </TableCell>
                <TableCell
                  className={`${CUENTA_TABLE_CELL_CLASS} text-center font-bold text-gray-900`}
                >
                  {formatCurrencyNoDecimals(p.subtotal)}
                </TableCell>
                <TableCell className={`${CUENTA_TABLE_CELL_CLASS} text-center`}>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => handleRemoveProducto(i)}
                    className='text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all p-2'
                  >
                    <Trash className='w-4 h-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!productos.length && (
              <TableRow>
                <TableCell colSpan={6} className={`${CUENTA_TABLE_CELL_CLASS} text-center py-12`}>
                  <div className='flex flex-col items-center gap-2'>
                    <div className='bg-gray-50 p-3 rounded-full'>
                      <Trash className='w-6 h-6 text-gray-200' />
                    </div>
                    <span className='text-gray-400 text-sm'>Tu carrito está vacío</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
