import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import React from 'react';
import Paginate from '@/components/shared/Paginate';
import { useCategoryProductsModal } from '@/hooks/orders/useCategoryProductsModal';
import { CategoryProductRow } from './CategoryProductRow';

interface CategoryProductsModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  productosCategoria: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  modalCategoria: any;
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] };
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  productosEnCarrito: any[];
  habitaciones?: any[];
  roomSelections?: { [key: string]: string };
  onRoomChange?: (productId: string, roomId: string) => void;
}

const CategoryProductsModal: React.FC<CategoryProductsModalProps> = ({
  open,
  onClose,
  loading,
  productosCategoria,
  cantidades,
  handleCantidadChange,
  handleAgregarProducto,
  modalCategoria,
  anfitrionas,
  champagneHostessSelections,
  onChampagneHostessChange,
  otherProductHostessSelections,
  onOtherProductHostessChange,
  productosEnCarrito,
  habitaciones = [],
  roomSelections = {},
  onRoomChange = () => {},
}) => {
  const {
    currentPage,
    setCurrentPage,
    currentProductos,
    totalPages,
    hostessSearchValues,
    debouncedSearchValues,
    setHostessSearchValues,
    availableHostesses,
    hasProductsWithCommission,
    requiresRoom,
    getAvailableHostessesForChampagne,
    getAvailableHostessesForOtherProducts,
  } = useCategoryProductsModal({
    open,
    loading,
    productosCategoria,
    anfitrionas,
    champagneHostessSelections,
    otherProductHostessSelections,
    productosEnCarrito,
    habitaciones,
    roomSelections,
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='max-w-7xl max-h-[95vh] flex flex-col p-0'>
        <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
          <DialogTitle>
            {modalCategoria
              ? `Productos de ${modalCategoria.nombre || modalCategoria.name}`
              : 'Productos'}
          </DialogTitle>
          {!loading && hasProductsWithCommission && (
            <div className='text-xs text-gray-700 dark:text-gray-200 mt-2 p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded'>
              <strong className='text-gray-900 dark:text-gray-100'>Reglas de asignación:</strong>
              <br />•{' '}
              <span className='text-purple-600 dark:text-purple-400 font-medium'>Champañas</span>:
              Selecciona múltiples anfitrionas (límite según precio)
              <br />•{' '}
              <span className='text-green-600 dark:text-green-400 font-medium'>
                Bebidas ≥ $30,000
              </span>
              : Hasta el mismo número de anfitrionas que la cantidad de tragos
              <br />•{' '}
              <span className='text-blue-600 dark:text-blue-400 font-medium'>
                Bebidas &lt; $30,000
              </span>
              : Una anfitriona por bebida, sin opción de habitación
            </div>
          )}
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 pb-8'>
          {loading ? (
            <div className='text-center text-gray-400 py-8 flex justify-center items-center'>
              Cargando productos...
            </div>
          ) : !Array.isArray(productosCategoria) || productosCategoria.length === 0 ? (
            <div className='text-center text-gray-400 py-8 w-full'>
              No hay productos en esta categoría.
            </div>
          ) : (
            <div className='w-full'>
              <div className='overflow-x-auto'>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PRODUCTO</TableHead>
                      <TableHead className='text-center'>PRECIO</TableHead>
                      <TableHead className='text-center'>COMISIÓN</TableHead>
                      <TableHead className='text-center'>CANTIDAD</TableHead>
                      <TableHead className='text-center'>HABITACIÓN</TableHead>
                      <TableHead className='text-center'>ANFITRIONA</TableHead>
                      <TableHead className='text-center'>AGREGAR</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentProductos.map(p => (
                      <CategoryProductRow
                        key={String(p.id_producto || p.id)}
                        product={p}
                        cantidades={cantidades}
                        onCantidadChange={handleCantidadChange}
                        onAgregarProducto={handleAgregarProducto}
                        champagneHostessSelections={champagneHostessSelections}
                        onChampagneHostessChange={onChampagneHostessChange}
                        otherProductHostessSelections={otherProductHostessSelections}
                        onOtherProductHostessChange={onOtherProductHostessChange}
                        habitaciones={habitaciones}
                        roomSelections={roomSelections}
                        onRoomChange={onRoomChange}
                        productosCategoria={productosCategoria}
                        debouncedSearchValues={debouncedSearchValues}
                        setHostessSearchValues={setHostessSearchValues}
                        availableHostesses={availableHostesses}
                        getAvailableHostessesForChampagne={getAvailableHostessesForChampagne}
                        getAvailableHostessesForOtherProducts={getAvailableHostessesForOtherProducts}
                        requiresRoom={requiresRoom}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className='flex justify-center mt-4'>
                  <Paginate page={currentPage} totalPages={totalPages} setPage={setCurrentPage} />
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className='shrink-0 border-t px-6 py-4'>
          <div className='w-full flex justify-center'>
            <Button
              onClick={onClose}
              variant='outline'
              size='sm'
              className='rounded-full px-4 bg-black text-white hover:scale-110 transition-all duration-200'
            >
              Aceptar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryProductsModal;
