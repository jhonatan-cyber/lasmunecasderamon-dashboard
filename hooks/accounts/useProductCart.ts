'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { saleInventoryFields, type SaleInventoryFields } from '@/lib/sales/saleInventoryFields';
import { accountCartKey } from '@/lib/sales/accountCartKey';

interface ProductoCarrito extends SaleInventoryFields {
  id?: string | number;
  producto_id?: string | number;
  id_producto: string | number;
  nombre: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  categoria_nombre: string;
  comision: number;
  selectedHostesses?: Array<string | number>;
  isChampagne?: boolean;
}

interface ProductoInput extends SaleInventoryFields {
  id_producto?: string | number;
  producto_id?: string | number;
  id?: string | number;
  cantidad?: number;
  nombre?: string;
  name?: string;
  precio?: number;
  price?: number;
  categoria_nombre?: string;
  categoria?: string;
  category?: string;
  comision?: number;
  commission?: number;
  selectedHostesses?: Array<string | number>;
  isChampagne?: boolean;
}

export function useProductCart() {
  const [productos, setProductos] = useState<ProductoCarrito[]>([]);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});

  const total = useMemo(() => productos.reduce((sum, p) => sum + p.sub_total, 0), [productos]);

  const agregarProducto = useCallback(
    (producto: ProductoInput, cantidadExtra?: number) => {
      const productoNormalizado = {
        ...producto,
        ...saleInventoryFields(producto),
        id_producto: producto.producto_id ?? producto.id_producto ?? producto.id ?? 0,
        nombre: producto.nombre || producto.name || '',
        precio: producto.precio ?? producto.price ?? 0,
        comision: producto.comision ?? producto.commission ?? 0,
        categoria_nombre:
          producto.categoria_nombre || producto.categoria || producto.category || 'Sin categoría',
        selectedHostesses: producto.selectedHostesses || [],
        isChampagne: producto.isChampagne || false
      };

      const quantityKey = String(producto.id ?? productoNormalizado.id_producto);
      const cantidad = cantidadExtra ?? producto.cantidad ?? cantidades[quantityKey] ?? 1;
      if (!Number.isInteger(cantidad) || cantidad < 1) return;

      setProductos(prev => {
        const existente = prev.find(p => accountCartKey(p) === accountCartKey(productoNormalizado));

        if (existente) {
          return prev.map(p =>
            accountCartKey(p) === accountCartKey(productoNormalizado)
              ? {
                  ...p,
                  cantidad: p.cantidad + cantidad,
                  sub_total: (p.cantidad + cantidad) * p.precio,
                  selectedHostesses: producto.selectedHostesses || p.selectedHostesses,
                  isChampagne: producto.isChampagne ?? p.isChampagne
                }
              : p
          );
        } else {
          const nuevoProducto: ProductoCarrito = {
            ...productoNormalizado,
            id_producto: productoNormalizado.id_producto,
            nombre: productoNormalizado.nombre,
            precio: productoNormalizado.precio,
            cantidad: cantidad,
            sub_total: productoNormalizado.precio * cantidad,
            categoria_nombre: productoNormalizado.categoria_nombre,
            comision: productoNormalizado.comision,
            selectedHostesses: producto.selectedHostesses || [],
            isChampagne: producto.isChampagne || false
          };
          return [...prev, nuevoProducto];
        }
      });
      setCantidades(prev => ({
        ...prev,
        [quantityKey]: 1
      }));

      toast.success(`${productoNormalizado.nombre} agregado al carrito`);
    },
    [cantidades]
  );

  const actualizarCantidad = useCallback((index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setProductos(prev => prev.filter((_, idx) => idx !== index));
      toast.success('Producto eliminado del carrito');
      return;
    }

    setProductos(prev =>
      prev.map((p, idx) =>
        idx === index
          ? {
              ...p,
              cantidad: nuevaCantidad,
              sub_total: nuevaCantidad * p.precio
            }
          : p
      )
    );
  }, []);

  const eliminarProducto = useCallback((index: number) => {
    setProductos(prev => prev.filter((_, idx) => idx !== index));
    toast.success('Producto eliminado del carrito');
  }, []);

  const limpiarCarrito = useCallback(() => {
    setProductos([]);
    setCantidades({});
  }, []);

  const setCantidad = useCallback((id: string | number, cantidad: number) => {
    setCantidades(prev => ({ ...prev, [id]: cantidad }));
  }, []);

  return {
    productos,
    cantidades,
    total,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    limpiarCarrito,
    setCantidad
  };
}
