'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import CategoryCardList from '@/components/shared/CategoryCardList';
import SaleProductModal from '@/components/sales/SaleProductModal';
import { ProductSearch } from '@/components/cuentas';
import { ProductCartTable } from '../tables/ProductCartTable';
import { CartSummary } from '../stats/CartSummary';
import { useProductCart } from '@/hooks/shared';
import { useMasterData, useRefreshOnFocus } from '@/hooks/shared';
import { useCuentaDetail } from '@/hooks/cuentas';
import { useTimer } from '@/contexts/TimerContext';
import { RoomSelect } from '@/components/shared/selects';
import { isExpensiveDrink } from '@/components/orders/productModalRules';
import { TimeSelect } from '@/components/shared/selects';
import { Badge } from '@/components/ui/badge';
import { formatLongDateEs } from '@/lib/utils/calendarUtils';
import logger from '@/lib/utils/logger';

interface AgregarProductosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaId: string | number | null;
  onProductosAgregados?: () => void;
}

interface Categoria {
  id_categoria?: number;
  id?: number;
  nombre?: string;
  name?: string;
  descripcion?: string;
  description?: string;
  estado?: number;
  status?: number;
  productCount?: number;
  total_products?: number;
}

interface Producto {
  id_producto: number;
  nombre: string;
  precio: number;
  categoria_id: number;
  categoria_nombre: string;
  stock?: number;
}

export default function AgregarProductosModal({
  open,
  onOpenChange,
  cuentaId,
  onProductosAgregados
}: AgregarProductosModalProps) {
  const cuentaIdStr = cuentaId ? String(cuentaId) : null;
  const [loadingAgregar, setLoadingAgregar] = useState(false);
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [habitacionId, setHabitacionId] = useState<string>('');
  const [tiempo, setTiempo] = useState<string>('60');

  const [modalCategoria, setModalCategoria] = useState<Categoria | null>(null);
  const [productosCategoria, setProductosCategoria] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { cuenta: cuentaActual } = useCuentaDetail(cuentaIdStr, open);
  const { categories: categorias, anfitrionas, rooms: habitaciones, refreshAll } = useMasterData();
  const { startTimer, getTimerByServicioId } = useTimer();

  const {
    productos: productosCarrito,
    cantidades,
    total: totalCarrito,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    limpiarCarrito,
    setCantidad
  } = useProductCart();

  useEffect(() => {
    if (cuentaActual?.habitacion_id) {
      setHabitacionId(String(cuentaActual.habitacion_id));
    }
  }, [cuentaActual?.habitacion_id]);

  useRefreshOnFocus(refreshAll, { enabled: open, immediate: false });

  const requiresRoomTimeSelection = useMemo(() => {
    return productosCarrito.some(p => isExpensiveDrink(p));
  }, [productosCarrito]);

  const handleOpenCategoria = useCallback(async (cat: Categoria) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(`/api/products?category_id=${cat.id_categoria || cat.id}`);
      const data = await res.json();
      if (data.success) {
        setProductosCategoria(data.data);
      } else {
        setProductosCategoria([]);
      }
    } catch (error) {
      logger.captureException(error, { context: 'AgregarProductosModal:addProduct' });
      setProductosCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const handleCantidadChange = useCallback(
    (id: string, value: string) => {
      const num = parseInt(value, 10);
      setCantidad(id, isNaN(num) ? 1 : num);
    },
    [setCantidad]
  );

  const agregarProductosACuenta = useCallback(async () => {
    if (!cuentaId || productosCarrito.length === 0) {
      toast.error('No hay productos en el carrito');
      return;
    }

    if (requiresRoomTimeSelection && (!habitacionId || !tiempo)) {
      toast.error(
        'Debes seleccionar habitacion y tiempo para productos con precio mayor a $30.000'
      );
      return;
    }

    setLoadingAgregar(true);
    try {
      let cuentaContext = cuentaActual;

      if (!cuentaContext && cuentaIdStr) {
        const cuentaResponse = await fetch(`/api/cuentas/${cuentaIdStr}`);
        if (cuentaResponse.ok) {
          const cuentaData = await cuentaResponse.json();
          cuentaContext = cuentaData?.data ?? cuentaData;
        }
      }

      const detalles = productosCarrito.map(producto => ({
        producto_id: producto.id_producto,
        precio: producto.precio,
        cantidad: producto.cantidad,
        sub_total: producto.sub_total,
        comision: producto.comision * producto.cantidad,
        hostesses: Array.isArray(producto.selectedHostesses) ? producto.selectedHostesses : [],
        isChampagne: Boolean(producto.isChampagne)
      }));

      const hostessIds = Array.from(
        new Set(
          productosCarrito.flatMap(producto =>
            Array.isArray(producto.selectedHostesses)
              ? producto.selectedHostesses.map((id: string | number) => String(id))
              : []
          )
        )
      );

      const existingHostessIds = Array.isArray(cuentaContext?.usuarios)
        ? cuentaContext.usuarios
            .map((usuario: any) => usuario.usuario_id ?? usuario.id_usuario ?? usuario.id)
            .filter(Boolean)
            .map((id: string | number) => String(id))
        : [];

      const mergedHostessIds = Array.from(new Set([...existingHostessIds, ...hostessIds]));
      const hasTimedAccountContext =
        Boolean(cuentaContext?.habitacion_id) && Number(cuentaContext?.tiempo || 0) > 0;
      const hasHostessProducts = hostessIds.length > 0;
      const hasActiveTimer = cuentaIdStr ? Boolean(getTimerByServicioId(cuentaIdStr)) : false;
      const shouldStartTimer = hasTimedAccountContext && hasHostessProducts && !hasActiveTimer;

      const payload: Record<string, unknown> = { detalles };

      if (mergedHostessIds.length > 0) {
        payload.usuarios = mergedHostessIds;
      }

      if (requiresRoomTimeSelection && habitacionId) {
        payload.habitacion_id = habitacionId;
        payload.tiempo = Number(tiempo);
      } else if (shouldStartTimer) {
        payload.habitacion_id = cuentaContext.habitacion_id;
        payload.tiempo = Number(cuentaContext.tiempo || 0);
      }

      const response = await fetch(`/api/cuentas/${cuentaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await response.json();

        const tiempoNum = Number(tiempo);
        const shouldStartNewTimer =
          requiresRoomTimeSelection &&
          habitacionId &&
          tiempoNum > 0 &&
          hostessIds.length > 0 &&
          !hasActiveTimer;

        if (shouldStartNewTimer && cuentaIdStr) {
          const habitacion = habitaciones.find(
            h => String(h.id_habitacion || h.id) === String(habitacionId)
          );
          startTimer(
            cuentaIdStr,
            String(habitacionId),
            habitacion?.nombre || 'Habitacion',
            tiempoNum,
            cuentaContext.codigo || `CUENTA_${cuentaIdStr}`,
            cuentaContext.cliente_nombre || 'Cliente',
            Array.isArray(cuentaContext?.usuarios)
              ? cuentaContext.usuarios
                  .map((usuario: any) => usuario.usuario_nombre || usuario.nick)
                  .filter(Boolean)
                  .join(', ')
              : '',
            'cuenta'
          );
        }

        toast.success('Productos agregados exitosamente');
        limpiarCarrito();
        onProductosAgregados?.();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al agregar productos');
      }
    } catch (error) {
      toast.error('Error al agregar productos a la cuenta');
    } finally {
      setLoadingAgregar(false);
    }
  }, [
    cuentaActual,
    cuentaId,
    cuentaIdStr,
    getTimerByServicioId,
    habitacionId,
    habitaciones,
    limpiarCarrito,
    onOpenChange,
    onProductosAgregados,
    productosCarrito,
    requiresRoomTimeSelection,
    startTimer,
    tiempo
  ]);

  const handleClose = useCallback(() => {
    limpiarCarrito();
    setModalOpen(false);
    setHabitacionId('');
    setTiempo('60');
    onOpenChange(false);
  }, [limpiarCarrito, onOpenChange]);

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className='sm:max-w-6xl max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className='shrink-0 px-6 pt-6 pb-4 border-b'>
            <div className='flex items-center justify-center'>
              <DialogTitle className='text-xl font-semibold'>
                Agregar Productos a la Cuenta
              </DialogTitle>
            </div>
          </DialogHeader>

          {cuentaActual && (
            <div className='mx-6 mt-4 rounded-lg border bg-slate-50 p-4 dark:bg-slate-800'>
              <div className='grid grid-cols-2 gap-4 text-sm md:grid-cols-4'>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Codigo:</span>{' '}
                  <span className='font-semibold'>{cuentaActual.codigo}</span>
                </div>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Cliente:</span>{' '}
                  <span className='font-semibold'>
                    {cuentaActual.cliente_nombre || 'Sin cliente'}
                  </span>
                </div>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Habitacion:</span>{' '}
                  <span className='font-semibold'>
                    {cuentaActual.habitacion_numero || 'Sin habitacion'}
                  </span>
                </div>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Fecha:</span>{' '}
                  <span className='font-semibold'>{formatLongDateEs(cuentaActual.fecha_crea)}</span>
                </div>
              </div>
              {cuentaActual.usuarios && cuentaActual.usuarios.length > 0 && (
                <div className='mt-2 text-sm'>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Anfitrionas:</span>{' '}
                  <span className='font-semibold'>
                    {cuentaActual.usuarios
                      .map((u: any) => u.usuario_nombre || u.nick)
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className='flex-1 overflow-y-auto px-6 py-4'>
            <div className='space-y-6'>
              <div className='w-full'>
                <ProductSearch
                  onAddProduct={agregarProducto}
                  placeholder='Buscar productos...'
                  className=''
                  searchOnly={false}
                  searchTerm={searchTerm}
                  onSearchTermChange={setSearchTerm}
                />
              </div>

              <CategoryCardList
                categorias={categorias}
                onSelect={handleOpenCategoria}
                center={true}
                filter={c => c.estado === 1 && (c.productCount || 0) > 0}
              />

              {requiresRoomTimeSelection && (
                <div className='grid grid-cols-2 gap-4'>
                  <RoomSelect
                    habitaciones={habitaciones}
                    value={habitacionId}
                    onChange={setHabitacionId}
                    label='Habitacion'
                    placeholder='Seleccionar habitacion'
                    filterByStatus={1}
                  />
                  <TimeSelect
                    value={tiempo}
                    onChange={setTiempo}
                    label='Tiempo'
                    placeholder='Seleccionar tiempo'
                    timeOptions={Array.from({ length: 13 }, (_, i) => i * 5)}
                  />
                </div>
              )}

              <CartSummary
                total={totalCarrito}
                itemCount={productosCarrito.length}
                onSubmit={agregarProductosACuenta}
                loading={loadingAgregar}
              />

              <div className='text-center text-sm text-gray-600'>Detalles Producto</div>

              <ProductCartTable
                productos={productosCarrito}
                onUpdateQuantity={actualizarCantidad}
                onRemove={eliminarProducto}
                anfitrionas={anfitrionas}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SaleProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productos={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={agregarProducto}
        categoria={modalCategoria}
        anfitrionas={anfitrionas}
        champagneHostessSelections={champagneHostessSelections}
        onChampagneHostessChange={(id, selectedIds) => {
          setChampagneHostessSelections(prev => ({ ...prev, [id]: selectedIds }));
        }}
        otherProductHostessSelections={otherProductHostessSelections}
        onOtherProductHostessChange={(id, selectedIds) => {
          setOtherProductHostessSelections(prev => ({ ...prev, [id]: selectedIds }));
        }}
        productosEnCarrito={productosCarrito}
      />
    </>
  );
}
