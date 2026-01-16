import { useState, useRef } from "react";
import OrderProductTable from "./OrderProductTable";
import CategoryProductsModal from "@/components/orders/CategoryProductsModal";
import CustomerSelect from "@/components/ui/CustomerSelect";
import HostessSelect from "@/components/ui/HostessSelect";
import OrderTotalHeader from "@/components/orders/OrderTotalHeader";
import CategoryCardList from "@/components/ui/CategoryCardList";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";

interface OrderFormProps {
  clientes: any[];
  anfitrionas: any[];
  categorias: any[];
  productos: any[];
  selectedCliente: string;
  setSelectedCliente: (v: string) => void;
  selectedAnfitrionas: string[];
  setSelectedAnfitrionas: (v: string[]) => void;
  onAddProducto?: (producto: any) => void;
  onRemoveProducto?: (index: number) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onToggleComision?: (index: number) => void;
  onSubmit?: () => void;
  searchCliente?: string;
  setSearchCliente?: (v: string) => void;
  searchAnfitriona?: string;
  setSearchAnfitriona?: (v: string) => void;
}

export default function OrderForm({
  clientes,
  anfitrionas,
  categorias,
  productos,
  selectedCliente,
  setSelectedCliente,
  selectedAnfitrionas,
  setSelectedAnfitrionas,
  onAddProducto,
  onRemoveProducto,
  onUpdateCantidad,
  onToggleComision,
  onSubmit,
}: OrderFormProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const [error, setError] = useState("");
  const router = useRouter();
  const { user } = useCurrentUser();

  // Calcular el total sumando los subtotales de los productos agregados
  const total = productos.reduce((acc, p) => acc + (p.subtotal || 0), 0);

  const handleOpenCategoria = async (cat: any) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(
        `/api/products?category_id=${cat.id_categoria || cat.id}`
      );
      const data = await res.json();
      if (data.success) setProductosCategoria(data.data);
      else setProductosCategoria([]);
    } catch {
      setProductosCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleCantidadChange = (id: string, value: string) => {
    const num = parseInt(value, 10);
    setCantidades((prev) => ({ ...prev, [id]: isNaN(num) ? 1 : num }));
  };

  const handleAgregarProducto = (producto: any) => {
    const cantidad = cantidades[producto.id_producto || producto.id] || 1;
    const comision = producto.comision ?? producto.commission ?? 0;
    
    // Lógica inteligente: Si el producto tiene comisión > 0, es para las chicas (1)
    // Si no tiene comisión (0), es para el cliente (0)
    const generaComision = comision > 0 ? 1 : 0;
    
    if (onAddProducto) {
      onAddProducto({
        ...producto,
        comision: comision,
        cantidad,
        subtotal: (producto.precio || producto.price) * cantidad,
        generaComision: generaComision,
      });
    }
    setCantidades((prev) => ({
      ...prev,
      [producto.id_producto || producto.id]: 1,
    }));
  };

  const handleUpdateCantidad = (index: number, nuevaCantidad: number) => {
    if (onUpdateCantidad) {
      onUpdateCantidad(index, nuevaCantidad);
    }
  };

  const handleToggleComision = (index: number) => {
    // Usar la función pasada desde el padre si existe
    if (onToggleComision) {
      onToggleComision(index);
    }
  };

  function generarCodigoPedido() {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  const handleSubmit = async () => {
    // Cliente es opcional, no validamos que esté seleccionado

    if (productos.length === 0) {
      setError("Debe agregar al menos un producto");
      return;
    }

    // Verificar si hay productos para chicas (generaComision = 1)
    const hayProductosParaChicas = productos.some(p => p.generaComision === 1);
    
    if (hayProductosParaChicas && selectedAnfitrionas.length === 0) {
      setError("Debe seleccionar al menos una anfitriona porque hay bebidas para las chicas");
      return;
    }

    if (!user?.id) {
      setError("No se pudo identificar al usuario actual (mesero)");
      return;
    }

    setError("");

    try {
      const codigo = generarCodigoPedido();
      const subtotal = productos.reduce(
        (sum, item) => sum + (item.subtotal || 0),
        0
      );
      const totalComision = productos.reduce(
        (sum, item) => sum + (item.comision || 0),
        0
      );
      const total = subtotal;
      const detalles = productos.map((item) => ({
        productoId: Number(item.id_producto || item.id),
        cantidad: Number(item.cantidad),
        precio: Number(item.precio || item.price),
        subtotal: Number(item.subtotal),
        comision: Number(item.comision || 0),
        generaComision: Number(item.generaComision ?? 1), // Por defecto 1 (genera comisión)
      }));
      const usuarios = selectedAnfitrionas.map((id) => ({ usuarioId: Number(id) }));

             const payload = {
         codigo,
         meseroId: Number(user.id),
         clienteId: selectedCliente ? Number(selectedCliente) : null, // NULL si no hay cliente
         subtotal: Number(subtotal),
         total: Number(total),
         totalComision: Number(totalComision),
         detalles,
         usuarios,
       };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 201 && data.success) {
        showSuccessToast("¡Pedido generado exitosamente!");
        // Limpiar formularios
        setSelectedCliente("");
        setSelectedAnfitrionas([]);
        if (onAddProducto) {
          // Limpiar productos si hay función para ello
          onAddProducto([]);
        }
        // Redirigir a la lista de pedidos después de un pequeño delay
        setTimeout(() => {
          router.push("/orders");
        }, 1500);
        if (onSubmit) onSubmit();
      } else {
        showErrorToast(data.message || "Error al generar el pedido");
      }
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      showErrorToast("Error inesperado al generar el pedido");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1">
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            label="Cliente"
            placeholder="Seleccionar cliente"
            required={false}
            className="w-full"
          />
        </div>
        <div className="flex-1">
          <HostessSelect
            anfitrionas={anfitrionas}
            value={selectedAnfitrionas}
            onChange={setSelectedAnfitrionas}
            label="Anfitrionas"
            placeholder="Seleccionar anfitrionas"
            required={true}
            maxSelection={10}
            className="w-full"
          />
        </div>
      </div>
      {error && (
        <div className="text-center text-red-500 text-sm mb-2">{error}</div>
      )}
      <OrderTotalHeader total={total} onSubmit={handleSubmit} />
      {/* Categorías activas */}
      <CategoryCardList
        categorias={categorias}
        onSelect={handleOpenCategoria}
        filter={(c: any) => c.status === 1 && (c.total_products || 0) > 0}
      />
      {/* Modal de productos por categoría */}
      <CategoryProductsModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        loading={loadingProductos}
        productosCategoria={productosCategoria}
        cantidades={cantidades}
        handleCantidadChange={handleCantidadChange}
        handleAgregarProducto={handleAgregarProducto}
        modalCategoria={modalCategoria}
      />
      {/* Tabla de productos */}
      <div className="mt-8">
        <div className="text-center text-gray-400 text-sm mb-2">
          Detalles Producto
        </div>
        <OrderProductTable
          productos={productos}
          onRemoveProducto={onRemoveProducto}
          onUpdateCantidad={handleUpdateCantidad}
          onToggleComision={handleToggleComision}
        />
      </div>
    </div>
  );
}
