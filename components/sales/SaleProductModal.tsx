'use client';
import { useRef, useState } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import Paginate from '@/components/shared/Paginate';
import { useSaleProductModal } from '@/hooks/sales/useSaleProductModal';
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleProduct = (id: string) =>
    setCollapsed(previous => ({ ...previous, [id]: !previous[id] }));
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

  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);
  const addDisabled =
    loading ||
    adding ||
    modal.selectedItems.length === 0 ||
    modal.selectedItems.some(item => item.agregarDisabled);
  const closeAndReset = () => {
    modal.resetSelection();
    setCollapsed({});
    onClose();
  };
  const addSelected = async () => {
    if (addDisabled || addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      for (const item of modal.selectedItems) await item.onAgregar();
      closeAndReset();
    } catch {
      toast.error('No se pudieron agregar los productos. Reintenta.');
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next && !addingRef.current) closeAndReset();
      }}
    >
      <DialogContent className='flex max-h-[94dvh] w-[calc(100vw-1rem)] max-w-[1480px] flex-col gap-0 overflow-hidden p-0 sm:w-[calc(100vw-3rem)] sm:rounded-2xl'>
        <DialogHeader className='shrink-0 border-b bg-muted/30 px-4 pb-4 pt-5 sm:px-6'>
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
            <div className='mr-7'>
              <SaleProductViewToggle viewMode={modal.viewMode} onValueChange={modal.setViewMode} />
            </div>
          </div>
        </DialogHeader>
        <div className='min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-6 sm:py-5'>
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
                      collapsed={collapsed}
                      onToggle={toggleProduct}
                      items={modal.items}
                      availableHostesses={modal.availableHostesses}
                    />
                  ) : (
                    <SaleProductCards
                      collapsed={collapsed}
                      onToggle={toggleProduct}
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
        <DialogFooter className='shrink-0 border-t bg-muted/30 px-4 py-3 sm:px-6'>
          <div className='flex w-full flex-col items-center gap-2'>
            {modal.selectedItems.length > 0 && (
              <span className='font-semibold'>
                {formatCurrencyNoDecimals(
                  modal.selectedItems.reduce(
                    (total, item) =>
                      total +
                      item.opcionesTipo.reduce(
                        (subtotal, option) => subtotal + option.precio * option.cantidad,
                        0
                      ),
                    0
                  )
                )}
              </span>
            )}
            <div className='flex items-center justify-center gap-3'>
              <Button
                variant='outline'
                className='rounded-full px-6'
                disabled={adding}
                onClick={closeAndReset}
              >
                Cancelar
              </Button>
              <Button
                onClick={addSelected}
                disabled={addDisabled}
                aria-label='Agregar producto'
                variant='outline'
                className='rounded-full bg-black px-6 text-white transition-all duration-200 hover:scale-105 hover:bg-black/80 dark:bg-white dark:text-black dark:hover:bg-white/90'
              >
                {adding ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Plus className='h-4 w-4' />
                )}
                {adding ? 'Agregando…' : 'Agregar'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
