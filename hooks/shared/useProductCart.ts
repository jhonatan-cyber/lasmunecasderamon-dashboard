import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';

interface ProductoCarrito {
  id_producto: number;
  nombre: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  categoria_nombre: string;
}

interface ProductoInput {
  id_producto?: number;
  id?: number;
  nombre?: string;
  name?: string;
  precio?: number;
  price?: number;
  categoria_nombre?: string;
  categoria?: string;
  category?: string;
}

/**
 * Hook para manejar el carrito de productos
 * Consolida la lógica de agregar, actualizar y eliminar productos del carrito
 */
export function useProductCart() {
  const [productos, setProductos] = useState<ProductoCarrito[]>([]);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});

  const total = useMemo(
    () => productos.reduce((sum, p) => sum + p.sub_total, 0),
    [productos]
  );

  const agregarProducto = useCallback((producto: ProductoInput, cantidadExtra?: number) => {
    // Normalizar el producto
    const productoNormalizado = {
      id_producto: producto.id_producto || producto.id || 0,
      nombre: producto.nombre || producto.name || '',
      precio: producto.precio || producto.price || 0,
      categoria_nombre:
        producto.categoria_nombre ||
        producto.categoria ||
        producto.category ||
        'Sin categoría',
    };

    const cantidad = cantidadExtra || cantidades[productoNormalizado.id_producto] || 1;

    setProductos((prev) => {
      const existente = prev.find((p) => p.id_producto === productoNormalizado.id_producto);

      if (existente) {
        // Si ya existe, aumentar cantidad
        return prev.map((p) =>
          p.id_producto === productoNormalizado.id_producto
            ? {
                ...p,
                cantidad: p.cantidad + cantidad,
                sub_total: (p.cantidad + cantidad) * p.precio,
              }
            : p
        );
      } else {
        // Si no existe, agregar nuevo
        const nuevoProducto: ProductoCarrito = {
          id_producto: productoNormalizado.id_producto,
          nombre: productoNormalizado.nombre,
          precio: productoNormalizado.precio,
          cantidad: cantidad,
          sub_total: productoNormalizado.precio * cantidad,
          categoria_nombre: productoNormalizado.categoria_nombre,
        };
        return [...prev, nuevoProducto];
      }
    });

    // Resetear cantidad para este producto
    setCantidades((prev) => ({
      ...prev,
      [productoNormalizado.id_producto]: 1,
    }));

    toast.success(`${productoNormalizado.nombre} agregado al carrito`);
  }, [cantidades]);

  const actualizarCantidad = useCallback((index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      setProductos((prev) => prev.filter((_, idx) => idx !== index));
      toast.success('Producto eliminado del carrito');
      return;
    }

    setProductos((prev) =>
      prev.map((p, idx) =>
        idx === index
          ? {
              ...p,
              cantidad: nuevaCantidad,
              sub_total: nuevaCantidad * p.precio,
            }
          : p
      )
    );
  }, []);

  const eliminarProducto = useCallback((index: number) => {
    setProductos((prev) => prev.filter((_, idx) => idx !== index));
    toast.success('Producto eliminado del carrito');
  }, []);

  const limpiarCarrito = useCallback(() => {
    setProductos([]);
    setCantidades({});
  }, []);

  const setCantidad = useCallback((id: string | number, cantidad: number) => {
    setCantidades((prev) => ({ ...prev, [id]: cantidad }));
  }, []);

  return {
    productos,
    cantidades,
    total,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    limpiarCarrito,
    setCantidad,
  };
}
