import React from 'react';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductTableRow } from './ProductTableRow';
import {
  CUENTA_TABLE_CARD_CLASS,
  CUENTA_TABLE_CLASS,
  CUENTA_TABLE_HEADER_CLASS,
  CUENTA_TABLE_HEADER_ROW_CLASS
} from '@/components/accounts/tables/cuentaTableStyles';

interface ProductSelectionTableProps {
  productos: any[];
  cantidades: { [key: string]: number };
  selectedProducts?: { [key: string]: number };
  onCantidadChange: (id: string, value: string) => void;
  onAddToSelection?: (producto: any) => void;
  onRemoveFromSelection?: (id: string) => void;
  onAddToCart: (producto: any) => void;
  showSelection?: boolean;
}

export const ProductSelectionTable: React.FC<ProductSelectionTableProps> = ({
  productos,
  cantidades,
  selectedProducts = {},
  onCantidadChange,
  onAddToSelection,
  onRemoveFromSelection,
  onAddToCart,
  showSelection = true
}) => {
  return (
    <div className={CUENTA_TABLE_CARD_CLASS}>
      <div className='overflow-x-auto'>
        <Table className={CUENTA_TABLE_CLASS}>
          <TableHeader className={CUENTA_TABLE_HEADER_CLASS}>
            <TableRow className={CUENTA_TABLE_HEADER_ROW_CLASS}>
              <TableHead>Producto</TableHead>
              <TableHead className='text-center'>Precio</TableHead>
              <TableHead className='text-center'>Categoría</TableHead>
              <TableHead className='text-center'>Comisión</TableHead>
              <TableHead className='text-center'>Cantidad</TableHead>
              <TableHead className='text-center'>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productos.map((producto, index) => {
              const id = (producto.id_producto || producto.id).toString();
              const isSelected = showSelection ? !!selectedProducts[id] : false;
              const cantidad = cantidades[id] || 1;

              return (
                <ProductTableRow
                  key={id}
                  producto={producto}
                  cantidad={cantidad}
                  isSelected={isSelected}
                  selectedQuantity={selectedProducts[id]}
                  onCantidadChange={newCantidad => onCantidadChange(id, newCantidad.toString())}
                  onAddToSelection={
                    showSelection && onAddToSelection ? () => onAddToSelection(producto) : () => {}
                  }
                  onRemoveFromSelection={
                    showSelection && onRemoveFromSelection
                      ? () => onRemoveFromSelection(id)
                      : () => {}
                  }
                  onAddToCart={() => onAddToCart(producto)}
                  isFirst={index === 0}
                  isLast={index === productos.length - 1}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
