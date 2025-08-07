import React, { useState } from 'react';
import { Product } from '@/types/product';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEllipsisV,
  faEdit,
  faTrash,
  faCheck,
  faPowerOff
} from '@fortawesome/free-solid-svg-icons';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { DeleteProductConfirmModal } from './DeleteProductConfirmModal';

interface ProductTableProps {
  products: Product[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onActivate: (product: Product) => void;
  onDeactivate: (product: Product) => void;
  isLoading: boolean;
  currentPage: number;
  pageSize: number;
}

const ProductTable: React.FC<ProductTableProps> = ({
  products,
  onEdit,
  onDelete,
  onActivate,
  onDeactivate,
  isLoading,
  currentPage,
  pageSize
}) => {
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const handleDeleteClick = (product: Product) => {
    setProductToDelete(product);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (productToDelete) {
      onDelete(productToDelete);
      setProductToDelete(null);
    }
  };

  return (
    <TooltipProvider>
      <div className='rounded-xl border bg-white overflow-hidden shadow-md'>
        <div className='overflow-x-auto'>
          <Table className='min-w-full text-base bg-white rounded-xl overflow-hidden text-center'>
            <TableHeader className='border-b last:border-b-0 bg-white group'>
              <TableRow>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>#</TableHead>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Código
                </TableHead>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Nombre
                </TableHead>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Precio
                </TableHead>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Comisión
                </TableHead>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Estado
                </TableHead>
                <TableHead className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-400'>
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && (
                <TableRow key='empty'>
                  <TableCell colSpan={7} className='text-center py-8 text-gray-400 bg-white text-sm sm:text-base'>
                    No hay productos
                  </TableCell>
                </TableRow>
              )}
              {products.map((product, idx) => (
                <TableRow
                  key={product.id}
                  className={`border-b bg-white group ${
                    idx === 0 ? 'first:rounded-t-xl' : ''
                  } ${idx === products.length - 1 ? 'last:rounded-b-xl' : ''}`}
                >
                  <TableCell className='py-3 px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600 font-medium'>
                    <Badge className='bg-purple-100 text-purple-700 rounded-full px-2 sm:px-3 py-1 text-xs sm:text-sm'>
                      {(currentPage - 1) * pageSize + idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>{product.code}</TableCell>
                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>{product.name}</TableCell>
                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                    ${product.price.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono text-xs sm:text-sm'>
                    ${product.commission.toLocaleString('es-CL')}
                  </TableCell>
                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono'>
                    {product.status === 1 ? (
                      <Badge className='bg-green-100 text-green-700 rounded-full px-2 sm:px-3 py-1 font-mono text-xs sm:text-sm'>
                        Activo
                      </Badge>
                    ) : (
                      <Badge className='bg-red-200 text-red-600 rounded-full px-2 sm:px-3 py-1 font-mono text-xs sm:text-sm'>
                        Inactivo
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className='py-3 px-2 sm:px-4 text-center font-mono'>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant='ghost'
                          size='icon'
                          className='bg-white hover:bg-gray-200 rounded-full hover:scale-105 transition-all duration-200'
                        >
                          <FontAwesomeIcon icon={faEllipsisV} className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align='end'>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => onEdit(product)}
                                className='cursor-pointer group'
                              >
                                <FontAwesomeIcon
                                  icon={faEdit}
                                  className='mr-2 text-purple-600 group-hover:text-purple-700 transition-colors'
                                />
                                <span className='group-hover:text-purple-700 transition-colors'>
                                  Editar
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Editar producto</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        {product.status === 1 ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  onClick={() => onDeactivate(product)}
                                  className='cursor-pointer group'
                                >
                                  <FontAwesomeIcon
                                    icon={faPowerOff}
                                    className='mr-2 text-orange-600 group-hover:text-orange-700 transition-colors'
                                  />
                                  <span className='group-hover:text-orange-700 transition-colors'>
                                    Desactivar
                                  </span>
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent>Desactivar producto</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <DropdownMenuItem
                                  onClick={() => onActivate(product)}
                                  className='cursor-pointer group'
                                >
                                  <FontAwesomeIcon
                                    icon={faCheck}
                                    className='mr-2 text-green-600 group-hover:text-green-700 transition-colors'
                                  />
                                  <span className='group-hover:text-green-700 transition-colors'>
                                    Activar
                                  </span>
                                </DropdownMenuItem>
                              </TooltipTrigger>
                              <TooltipContent>Activar producto</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(product)}
                                className='cursor-pointer group'
                              >
                                <FontAwesomeIcon
                                  icon={faTrash}
                                  className='mr-2 text-red-600 group-hover:text-red-700 transition-colors'
                                />
                                <span className='group-hover:text-red-700 transition-colors'>
                                  Eliminar
                                </span>
                              </DropdownMenuItem>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar producto</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <DeleteProductConfirmModal
        open={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        onConfirm={handleConfirmDelete}
        productName={productToDelete?.name || ''}
      />
    </TooltipProvider>
  );
};

export default ProductTable;
