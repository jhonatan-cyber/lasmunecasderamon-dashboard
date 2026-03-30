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
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingAgregar, setLoadingAgregar] = useState(false);

  // Estados para el modal de productos
  const [modalCategoria, setModalCategoria] = useState<Categoria | null>(null);
  const [productosCategoria, setProductosCategoria] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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
    }
  }, [open]);

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
      console.error('Error al obtener categorías:', error);
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
      console.error('Error al obtener productos:', error);
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

    setLoadingAgregar(true);
    try {
      const detalles = productosCarrito.map(producto => ({
        producto_id: producto.id_producto,
        precio: producto.precio,
        cantidad: producto.cantidad,
        sub_total: producto.sub_total,
        comision: producto.comision * producto.cantidad
      }));

      const response = await fetch(`/api/cuentas/${cuentaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          detalles: detalles
        })
      });

      if (response.ok) {
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
  }, [cuentaId, productosCarrito, limpiarCarrito, onProductosAgregados, onOpenChange]);

  const handleClose = useCallback(() => {
    limpiarCarrito();
    setModalOpen(false);
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
        anfitrionas={[]}
        champagneHostessSelections={{}}
        onChampagneHostessChange={() => {}}
        otherProductHostessSelections={{}}
        onOtherProductHostessChange={() => {}}
        productosEnCarrito={productosCarrito}
      />
    </>
  );
}
