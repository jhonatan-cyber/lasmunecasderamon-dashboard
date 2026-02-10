"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import CategoryCardList from "@/components/ui/CategoryCardList";
import SaleProductModal from "@/components/sales/SaleProductModal";
import ProductSearch from "@/components/ui/ProductSearch";
import { ProductCartTable } from "./ProductCartTable";
import { CartSummary } from "./CartSummary";
import { useProductCart } from "@/hooks/shared/useProductCart";

interface AgregarProductosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cuentaId: number | null;
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
  onProductosAgregados,
}: AgregarProductosModalProps) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingAgregar, setLoadingAgregar] = useState(false);

  // Estados para el modal de productos
  const [modalCategoria, setModalCategoria] = useState<Categoria | null>(null);
  const [productosCategoria, setProductosCategoria] = useState<Producto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Hook del carrito
  const {
    productos: productosCarrito,
    cantidades,
    total: totalCarrito,
    agregarProducto,
    actualizarCantidad,
    eliminarProducto,
    limpiarCarrito,
    setCantidad,
  } = useProductCart();

  useEffect(() => {
    if (open) {
      fetchCategorias();
    }
  }, [open]);

  const fetchCategorias = useCallback(async () => {
    try {
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await loadCategoriasConProductos(data.data);
        }
      }
    } catch (error) {
      console.error("Error al obtener categorías:", error);
      // Datos de prueba si no hay API
      const categoriasPrueba = [
        {
          id: 1,
          name: "Bebidas Chicas",
          description: "Bebidas pequeñas y refrescos",
          status: 1,
          total_products: 4,
        },
        {
          id: 2,
          name: "Cerveza",
          description: "Variedad de cervezas",
          status: 1,
          total_products: 4,
        },
        {
          id: 3,
          name: "Champaña",
          description: "Champagne y vinos espumantes",
          status: 1,
          total_products: 3,
        },
        {
          id: 4,
          name: "Comidas",
          description: "Platos principales y entradas",
          status: 1,
          total_products: 2,
        },
        {
          id: 5,
          name: "Postres",
          description: "Dulces y postres",
          status: 1,
          total_products: 2,
        },
        {
          id: 6,
          name: "Servicios",
          description: "Servicios adicionales",
          status: 1,
          total_products: 2,
        },
      ];
      await loadCategoriasConProductos(categoriasPrueba);
    }
  }, []);

  const loadCategoriasConProductos = useCallback(async (categoriasData: any[]) => {
    const categoriasConConteo = categoriasData.map((cat) => {
      // Usar total_products del endpoint o 0 si no existe
      const productCount = cat.total_products || 0;
      return {
        ...cat,
        productCount,
        // Asegurar que tenga los campos esperados por el componente
        id_categoria: cat.id,
        nombre: cat.name || cat.nombre,
        estado: cat.status,
      };
    });
    setCategorias(categoriasConConteo);
  }, []);

  const handleOpenCategoria = useCallback(async (cat: Categoria) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(
        `/api/products?category_id=${cat.id_categoria || cat.id}`
      );
      const data = await res.json();
      if (data.success) {
        setProductosCategoria(data.data);
      } else {
        // Datos de prueba
        const productosPrueba = {
          1: [
            {
              id_producto: 1,
              nombre: "Coca Cola",
              precio: 5000,
              categoria_id: 1,
              categoria_nombre: "Bebidas Chicas",
              stock: 100,
            },
            {
              id_producto: 2,
              nombre: "Sprite",
              precio: 5000,
              categoria_id: 1,
              categoria_nombre: "Bebidas Chicas",
              stock: 80,
            },
            {
              id_producto: 3,
              nombre: "Fanta",
              precio: 5000,
              categoria_id: 1,
              categoria_nombre: "Bebidas Chicas",
              stock: 60,
            },
            {
              id_producto: 4,
              nombre: "Agua Mineral",
              precio: 3000,
              categoria_id: 1,
              categoria_nombre: "Bebidas Chicas",
              stock: 150,
            },
          ],
          2: [
            {
              id_producto: 5,
              nombre: "Paceña",
              precio: 20000,
              categoria_id: 2,
              categoria_nombre: "Cerveza",
              stock: 50,
            },
            {
              id_producto: 6,
              nombre: "Corona",
              precio: 25000,
              categoria_id: 2,
              categoria_nombre: "Cerveza",
              stock: 40,
            },
            {
              id_producto: 7,
              nombre: "Heineken",
              precio: 22000,
              categoria_id: 2,
              categoria_nombre: "Cerveza",
              stock: 35,
            },
            {
              id_producto: 8,
              nombre: "Budweiser",
              precio: 18000,
              categoria_id: 2,
              categoria_nombre: "Cerveza",
              stock: 45,
            },
          ],
          3: [
            {
              id_producto: 9,
              nombre: "Champagne Moët",
              precio: 150000,
              categoria_id: 3,
              categoria_nombre: "Champaña",
              stock: 10,
            },
            {
              id_producto: 10,
              nombre: "Vino Espumante",
              precio: 80000,
              categoria_id: 3,
              categoria_nombre: "Champaña",
              stock: 15,
            },
            {
              id_producto: 11,
              nombre: "Prosecco",
              precio: 60000,
              categoria_id: 3,
              categoria_nombre: "Champaña",
              stock: 20,
            },
          ],
          4: [
            {
              id_producto: 12,
              nombre: "Hamburguesa Premium",
              precio: 25000,
              categoria_id: 4,
              categoria_nombre: "Comidas",
              stock: 30,
            },
            {
              id_producto: 13,
              nombre: "Pizza Margherita",
              precio: 30000,
              categoria_id: 4,
              categoria_nombre: "Comidas",
              stock: 25,
            },
          ],
          5: [
            {
              id_producto: 14,
              nombre: "Tiramisú",
              precio: 12000,
              categoria_id: 5,
              categoria_nombre: "Postres",
              stock: 15,
            },
            {
              id_producto: 15,
              nombre: "Cheesecake",
              precio: 10000,
              categoria_id: 5,
              categoria_nombre: "Postres",
              stock: 20,
            },
          ],
          6: [
            {
              id_producto: 16,
              nombre: "Servicio de Limpieza",
              precio: 15000,
              categoria_id: 6,
              categoria_nombre: "Servicios",
              stock: 999,
            },
            {
              id_producto: 17,
              nombre: "Hielo Premium",
              precio: 5000,
              categoria_id: 6,
              categoria_nombre: "Servicios",
              stock: 50,
            },
          ],
        };
        const categoriaId = cat.id_categoria || cat.id || 1;
        setProductosCategoria(
          productosPrueba[categoriaId as keyof typeof productosPrueba] || []
        );
      }
    } catch (error) {
      console.error("Error al obtener productos:", error);
      setProductosCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const handleCantidadChange = useCallback((id: string, value: string) => {
    const num = parseInt(value, 10);
    setCantidad(id, isNaN(num) ? 1 : num);
  }, [setCantidad]);

  const agregarProductosACuenta = useCallback(async () => {
    if (!cuentaId || productosCarrito.length === 0) {
      toast.error("No hay productos en el carrito");
      return;
    }

    setLoadingAgregar(true);
    try {
      const detalles = productosCarrito.map((producto) => ({
        producto_id: producto.id_producto,
        precio: producto.precio,
        cantidad: producto.cantidad,
        sub_total: producto.sub_total,
        comision: Math.round(producto.sub_total * 0.25), // 25% de comisión
      }));

      console.log("Enviando detalles a la API:", detalles);

      const response = await fetch(`/api/cuentas/${cuentaId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          detalles: detalles,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Respuesta de la API:", result);
        toast.success("Productos agregados exitosamente");
        limpiarCarrito();
        onProductosAgregados?.();
        onOpenChange(false);
      } else {
        const errorData = await response.json();
        console.error("Error response:", errorData);
        throw new Error(errorData.message || "Error al agregar productos");
      }
    } catch (error) {
      console.error("Error al agregar productos:", error);
      toast.error("Error al agregar productos a la cuenta");
    } finally {
      setLoadingAgregar(false);
    }
  }, [cuentaId, productosCarrito, limpiarCarrito, onProductosAgregados, onOpenChange]);

  const handleClose = useCallback(() => {
    limpiarCarrito();
    setModalOpen(false);
    onOpenChange(false);
  }, [limpiarCarrito, onOpenChange]);

  // Debug: Ver productos en carrito cuando cambian
  useEffect(() => {
    console.log("Productos en carrito actualizados:", productosCarrito);
    console.log("Total del carrito actualizado:", totalCarrito);
  }, [productosCarrito, totalCarrito]);

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-6xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
            <div className="flex items-center justify-center">
              <DialogTitle className="text-xl font-semibold">
                Agregar Productos a la Cuenta
              </DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">

            <div className="space-y-6">
            {/* Tabla de búsqueda - Contenedor independiente */}
            <div className="w-full">
              <ProductSearch
                onAddProduct={agregarProducto}
                placeholder="Buscar productos..."
                className=""
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
              filter={(c) => c.estado === 1 && (c.productCount || 0) > 0}
            />

            <CartSummary
              total={totalCarrito}
              itemCount={productosCarrito.length}
              onSubmit={agregarProductosACuenta}
              loading={loadingAgregar}
            />

            {/* Detalles Producto */}
            <div className="text-center text-sm text-gray-600">
              Detalles Producto
            </div>

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
