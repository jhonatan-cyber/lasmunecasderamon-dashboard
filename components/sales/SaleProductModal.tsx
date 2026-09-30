'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { useSaleProductModal } from '@/hooks/shared/useSaleProductModal';
import { SaleProductViewToggle } from '@/components/sales/product-modal/SaleProductViewToggle';
import { SaleProductSearch } from '@/components/sales/product-modal/SaleProductSearch';
import { SaleProductTable } from '@/components/sales/product-modal/SaleProductTable';
import { SaleProductCards } from '@/components/sales/product-modal/SaleProductCards';

interface SaleProductModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  productos: any[];
  cantidades: { [key: string]: number };
  handleCantidadChange: (id: string, value: string) => void;
  handleAgregarProducto: (producto: any) => void;
  categoria: any;
  anfitrionas: any[];
  champagneHostessSelections: { [key: string]: string[] };
  onChampagneHostessChange: (productId: string, hostessIds: string[]) => void;
  otherProductHostessSelections: { [key: string]: string[] };
  onOtherProductHostessChange: (productId: string, hostessIds: string[]) => void;
  productosEnCarrito: any[];
}

/**
 * Modal de productos en bar para registrar una venta (o agregar a una cuenta).
 * Antes monolítico (675 líneas); ahora compone:
 *  - `useSaleProductModal` → vista, búsqueda, paginación, tipo de venta,
 *    selección de anfitrionas y el modelo de vista de cada producto
 *  - subcomponentes presentacionales en `components/sales/product-modal/`
 * La API pública no cambia: consumidores y test siguen importando el default.
 */
export default function SaleProductModal({
  open,
  onClose,
  loading,
  productos,
  cantidades,
  handleCantidadChange,
  handleAgregarProducto,
  categoria,
  anfitrionas,
  champagneHostessSelections,
  onChampagneHostessChange,
  otherProductHostessSelections,
  onOtherProductHostessChange,
  productosEnCarrito
}: SaleProductModalProps) {
  const modal = useSaleProductModal({
    open,
    productos,
    cantidades,
    handleCantidadChange,
    handleAgregarProducto,
    anfitrionas,
    champagneHostessSelections,
    onChampagneHostessChange,
    otherProductHostessSelections,
    onOtherProductHostessChange,
    productosEnCarrito
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className='flex max-h-[90vh] max-w-5xl flex-col gap-0 p-0'>
        <DialogHeader className='shrink-0 border-b px-6 pb-4 pt-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div>
              <DialogTitle className='text-lg'>
                {categoria
                  ? `Productos en bar · ${categoria.nombre || categoria.name}`
                  : 'Productos en bar'}
              </DialogTitle>
              <p className='mt-1 text-sm text-muted-foreground'>
                {modal.queryNorm
                  ? `${modal.filteredCount} de ${productos?.length || 0} presentaciones`
                  : productos?.length
                    ? `${productos.length} ${productos.length === 1 ? 'presentación disponible' : 'presentaciones disponibles'} en bar`
                    : 'Sin productos con stock en bar'}
              </p>
            </div>
            <SaleProductViewToggle viewMode={modal.viewMode} onValueChange={modal.setViewMode} />
          </div>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
          {loading ? (
            <div className='text-center text-gray-400 py-8 flex justify-center items-center'>
              Cargando productos...
            </div>
          ) : (
            <div className='w-full'>
              <SaleProductSearch
                value={modal.query}
                onChange={modal.handleQueryChange}
                onClear={modal.clearQuery}
              />
              {!Array.isArray(productos) || productos.length === 0 ? (
                <div className='text-center text-gray-400 py-8 w-full'>
                  No hay productos con stock disponible en el bar para esta categoría.
                </div>
              ) : modal.filteredCount === 0 ? (
                <div className='w-full py-8 text-center text-gray-400'>
                  Sin resultados para “{modal.query.trim()}”.
                </div>
              ) : (
                <>
                  {modal.viewMode === 'table' ? (
                    <SaleProductTable
                      items={modal.items}
                      availableHostesses={modal.availableHostesses}
                    />
                  ) : (
                    <SaleProductCards
                      items={modal.items}
                      availableHostesses={modal.availableHostesses}
                    />
                  )}

                  {modal.totalPages > 1 && (
                    <div className='flex justify-center mt-4'>
                      <Paginate
                        page={modal.currentPage}
                        totalPages={modal.totalPages}
                        setPage={modal.setCurrentPage}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
        <DialogFooter className='shrink-0 border-t px-6 py-4'>
          <div className='w-full flex justify-center'>
            <Button
              onClick={onClose}
              variant='outline'
              className='rounded-full bg-black px-6 text-white transition-all duration-200 hover:scale-105 hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90'
            >
              Aceptar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
