/* eslint-disable */
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import CategoryCardList from '@/components/shared/CategoryCardList';
import SaleProductModal from '@/components/sales/SaleProductModal';
import ProductSearch from '@/components/cuentas/filters/ProductSearch';
import { ProductCartTable } from '../tables/ProductCartTable';
import { CartSummary } from '../stats/CartSummary';
import { useProductCart } from '@/hooks/shared/useProductCart';
import { useCuentaDetail } from '@/hooks/cuentas';
import { useTimer } from '@/contexts/TimerContext';
import RoomSelect from '@/components/shared/selects/RoomSelect';
import TimeSelect from '@/components/shared/selects/TimeSelect';
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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingAgregar, setLoadingAgregar] = useState(false);
  const [anfitrionas, setAnfitrionas] = useState<any[]>([]);
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [habitaciones, setHabitaciones] = useState<any[]>([]);
  const [habitacionId, setHabitacionId] = useState<string>('');
  const [tiempo, setTiempo] = useState<string>('60');

  // Estados para el modal de productos
  const [modalCategoria, setModalCategoria] = useState<Categoria | null>(null);
  const [productosCategoria, setProductosCategoria] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { cuenta: cuentaActual } = useCuentaDetail(cuentaIdStr, open);
  const { startTimer, getTimerByServicioId } = useTimer();

  // Hook del carrito
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
    if (open) {
      fetchCategorias();
      fetchAnfitrionas();
      fetchHabitaciones();
    }
  }, [open]);

  // Preseleccionar habitación de la cuenta cuando está disponible
  useEffect(() => {
    if (cuentaActual?.habitacion_id) {
      setHabitacionId(String(cuentaActual.habitacion_id));
    }
  }, [cuentaActual?.habitacion_id]);

  const fetchHabitaciones = useCallback(async () => {
    try {
      const response = await fetch('/api/rooms');
      const data = await response.json();
      if (data.success) {
        setHabitaciones(data.data);
      }
    } catch (error) {
      logger.captureException(error, { context: 'AgregarProductosModal:fetchHabitaciones' });
    }
  }, []);

  // Check if any product in cart requires room/time selection (>=30000)
  const requiresRoomTimeSelection = useMemo(() => {
    return productosCarrito.some(p => {
      const precio = Number(p.precio || 0);
      return precio >= 30000;
    });
  }, [productosCarrito]);

  const fetchAnfitrionas = useCallback(async () => {
    try {
      const response = await fetch('/api/users?anfitrionas=1&status=active&loggedIn=1&enLocal=1');
      const data = await response.json();
      if (data.success) {
        setAnfitrionas(data.data);
      }
    } catch (error) {
      logger.captureException(error, { context: 'AgregarProductosModal:fetchAnfitrionas' });
    }
  }, []);

  const fetchCategorias = useCallback(async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadCategoriasConProductos(data.data);
        }
      }
    } catch (error) {
      logger.captureException(error, { context: 'AgregarProductosModal:fetchCategorias' });
      toast.error('Error al cargar categorías');
    }
  }, []);

  const loadCategoriasConProductos = useCallback(async (categoriasData: any[]) => {
    const categoriasConConteo = categoriasData.map(cat => {
      const productCount = cat.total_products || 0;
      return {
        ...cat,
        productCount,
        id_categoria: cat.id,
        nombre: cat.name || cat.nombre,
        estado: cat.status
      };
    });
    setCategorias(categoriasConConteo);
  }, []);

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

    // Validar selección de habitación y tiempo si productos >= 30000
    if (requiresRoomTimeSelection && (!habitacionId || !tiempo)) {
      toast.error(
        'Debes seleccionar habitación y tiempo para productos con precio mayor a $30.000'
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

      const payload: Record<string, unknown> = {
        detalles
      };

      if (mergedHostessIds.length > 0) {
        payload.usuarios = mergedHostessIds;
      }

      // Si productos >= 30000, usar la habitación y tiempo seleccionados en el modal
      // Solo activar timer si tiempo > 0
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
        const result = await response.json();

        // Solo iniciar timer si tiempo > 0 y hay productos con anfitrionas
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
          <DialogHeader className='flex-shrink-0 px-6 pt-6 pb-4 border-b'>
            <div className='flex items-center justify-center'>
              <DialogTitle className='text-xl font-semibold'>
                Agregar Productos a la Cuenta
              </DialogTitle>
            </div>
          </DialogHeader>

          {/* Info de la cuenta actual */}
          {cuentaActual && (
            <div className='mx-6 mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border'>
              <div className='grid grid-cols-2 md:grid-cols-4 gap-4 text-sm'>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Código:</span>{' '}
                  <span className='font-semibold'>{cuentaActual.codigo}</span>
                </div>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Cliente:</span>{' '}
                  <span className='font-semibold'>
                    {cuentaActual.cliente_nombre || 'Sin cliente'}
                  </span>
                </div>
                <div>
                  <span className='font-medium text-gray-500 dark:text-gray-400'>Habitación:</span>{' '}
                  <span className='font-semibold'>
                    {cuentaActual.habitacion_numero || 'Sin habitación'}
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
              {/* Tabla de búsqueda - Contenedor independiente */}
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

              {/* Categorías */}
              <CategoryCardList
                categorias={categorias}
                onSelect={handleOpenCategoria}
                center={true}
                filter={c => c.estado === 1 && (c.productCount || 0) > 0}
              />

              {/* Selección de Habitación y Tiempo - solo si hay productos >= 30000 */}
              {requiresRoomTimeSelection && (
                <div className='grid grid-cols-2 gap-4'>
                  <RoomSelect
                    habitaciones={habitaciones}
                    value={habitacionId}
                    onChange={setHabitacionId}
                    label='Habitación'
                    placeholder='Seleccionar habitación'
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

              {/* Detalles Producto */}
              <div className='text-center text-sm text-gray-600'>Detalles Producto</div>

              {/* Tabla de productos */}
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

      {/* Modal de Productos */}
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
