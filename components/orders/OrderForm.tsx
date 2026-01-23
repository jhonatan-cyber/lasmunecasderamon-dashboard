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
  onAssignHostess?: (index: number, hostessId: string) => void;
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
  onAssignHostess,
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

  const selectedHostessPool = anfitrionas.filter((a) =>
    selectedAnfitrionas.includes(String(a.id_usuario || a.id))
  );

  const hostessOptions = (selectedHostessPool.length > 0 ? selectedHostessPool : anfitrionas).map((a) => ({
    id: String(a.id_usuario || a.id),
    name: a.nick || `${a.nombre || a.name || ""} ${a.apellido || a.lastName || ""}`.trim(),
  }));

  // Calcula el límite de anfitrionas permitido según productos con comisión y champaña
  const computeHostessLimit = (productosLista: any[]) => {
    const isChampagneProduct = (p: any) => {
      const cat = (p.categoria || p.category_name || "").toLowerCase();
      return (
        cat.includes("champaña") ||
        cat.includes("shampaña") ||
        cat.includes("champagne")
      );
    };

    const champagneProducts = productosLista.filter(isChampagneProduct);
    const otherCommissionProducts = productosLista.filter(
      (p) => !isChampagneProduct(p) && (p.generaComision === 1 || p.genera_comision === 1)
    );

    const otherCommissionQuantity = otherCommissionProducts.reduce(
      (sum, p) => sum + (Number(p.cantidad) || 1),
      0
    );

    let champagneLimit = 0;
    let maxChampagnePrice = 0;

    if (champagneProducts.length > 0) {
      maxChampagnePrice = Math.max(
        ...champagneProducts.map((p) => Number(p.precio || p.price || 0))
      );

      if (maxChampagnePrice >= 240000) champagneLimit = 5;
      else if (maxChampagnePrice >= 200000) champagneLimit = 4;
      else if (maxChampagnePrice >= 160000) champagneLimit = 3;
      else if (maxChampagnePrice >= 120000) champagneLimit = 2;
      else champagneLimit = 1;
    }

    const maxAnfitrionas = champagneProducts.length > 0
      ? champagneLimit + otherCommissionQuantity
      : otherCommissionQuantity;

    return {
      maxAnfitrionas,
      champagneLimit,
      otherCommissionQuantity,
      hasChampagne: champagneProducts.length > 0,
      maxChampagnePrice,
    };
  };

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
    const comisionUnitaria = producto.comision ?? producto.commission ?? 0;
    
    // Lógica inteligente: Si el producto tiene comisión > 0, es para las chicas (1)
    // Si no tiene comisión (0), es para el cliente (0)
    const generaComision = comisionUnitaria > 0 ? 1 : 0;
    
    if (onAddProducto) {
      onAddProducto({
        ...producto,
        comision: comisionUnitaria * cantidad, // Comisión total = comisión unitaria * cantidad
        comisionUnitaria: comisionUnitaria, // Guardar también la comisión unitaria
        cantidad,
        subtotal: (producto.precio || producto.price) * cantidad,
        generaComision: generaComision,
        hostessId: "", // anfitriona asignada para la comisión
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

  const handleAssignHostess = (index: number, hostessId: string) => {
    onAssignHostess?.(index, hostessId);
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

    // Si no hay productos con comisión, no debe haber anfitrionas seleccionadas
    if (!hayProductosParaChicas && selectedAnfitrionas.length > 0) {
      setError("No puede seleccionar anfitrionas para productos sin comisión");
      return;
    }

    const isChampagneProduct = (p: any) => {
      const cat = (p.categoria || p.category_name || "").toLowerCase();
      return cat.includes("champaña") || cat.includes("shampaña") || cat.includes("champagne");
    };

    const hasChampagne = productos.some(isChampagneProduct);

    // Solo validar asignación individual si HAY champaña en el pedido
    if (hasChampagne) {
      // Validar que las anfitrionas asignadas estén en la lista seleccionada
      const productosConComision = productos.filter((p) => p.generaComision === 1 && !isChampagneProduct(p));
      const hostessAssignments = productosConComision.map((p) => p.hostessId).filter(Boolean) as string[];
      const uniqueAssignments = Array.from(new Set(hostessAssignments));

      // Solo validar unicidad si hay asignaciones
      if (uniqueAssignments.length > 0) {
        if (uniqueAssignments.length !== hostessAssignments.length) {
          setError("Cada producto con comisión debe tener una anfitriona distinta si se asigna");
          return;
        }

        if (uniqueAssignments.some((id) => !selectedAnfitrionas.includes(id))) {
          setError("Las anfitrionas asignadas deben estar seleccionadas en la lista de anfitrionas");
          return;
        }
      }
    }
    // Si NO hay champaña o no hay asignaciones, la comisión se reparte entre todas

    // Validar límites de anfitrionas combinando champaña y productos con comisión
    const hostessLimits = computeHostessLimit(productos);
    const {
      maxAnfitrionas,
      champagneLimit,
      otherCommissionQuantity,
      maxChampagnePrice,
    } = hostessLimits;

    if (hasChampagne) {
      const uniqueAssignments = Array.from(new Set(
        productos
          .filter((p) => p.generaComision === 1 && !isChampagneProduct(p))
          .map((p) => p.hostessId)
          .filter(Boolean)
      )) as string[];

      if (uniqueAssignments.length > maxAnfitrionas) {
        setError(`El pedido excede el límite de anfitrionas permitidas (${maxAnfitrionas}) para los productos con comisión`);
        return;
      }

      // Asegurar que quede cupo suficiente para repartir la champaña entre las anfitrionas no asignadas a tragos con comisión
      const remainingForChampagne = selectedAnfitrionas.length - uniqueAssignments.length;
      if (remainingForChampagne > champagneLimit) {
        setError(`Se requieren máximo ${champagneLimit} anfitriona${champagneLimit !== 1 ? 's' : ''} libres para la champaña; ajuste asignaciones o reduzca anfitrionas`);
        return;
      }
    }

    if (selectedAnfitrionas.length > maxAnfitrionas) {
      if (hasChampagne) {
        const extraText = otherCommissionQuantity > 0
          ? ` + ${otherCommissionQuantity} por ${otherCommissionQuantity === 1 ? 'trago' : 'tragos'} con comisión`
          : '';
        setError(`El pedido excede el límite de ${champagneLimit} anfitriona${champagneLimit !== 1 ? 's' : ''} por champaña${extraText ? extraText : ''} (máximo ${maxAnfitrionas})`);
      } else if (otherCommissionQuantity > 0) {
        setError(`El pedido excede el límite de ${otherCommissionQuantity} anfitriona${otherCommissionQuantity !== 1 ? 's' : ''} para ${otherCommissionQuantity} producto${otherCommissionQuantity !== 1 ? 's' : ''} con comisión`);
      } else if (maxChampagnePrice > 0) {
        setError('No puede seleccionar anfitrionas para productos sin comisión');
      }
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
        hostessId: item.hostessId ? Number(item.hostessId) : null,
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

  // Calcular el máximo de anfitrionas permitidas según las reglas
  const calcularMaxAnfitrionas = () => {
    return computeHostessLimit(productos).maxAnfitrionas;
  };

  const hostessLimits = computeHostessLimit(productos);
  const maxAnfitrionasPermitidas = hostessLimits.maxAnfitrionas;

  return (
    <div className="space-y-8">
      {/* Categorías activas */}
      <CategoryCardList
        categorias={categorias}
        onSelect={handleOpenCategoria}
        filter={(c: any) => c.status === 1 && (c.total_products || 0) > 0}
      />
      
      <div className="flex flex-col md:flex-row gap-6 mb-6">
        <div className="flex-1">
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            label="Cliente (Opcional)"
            placeholder="Sin cliente seleccionado"
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
            placeholder={maxAnfitrionasPermitidas === 0 ? "No disponible para productos sin comisión" : "Seleccionar anfitrionas"}
            required={maxAnfitrionasPermitidas > 0}
            maxSelection={maxAnfitrionasPermitidas}
            disabled={maxAnfitrionasPermitidas === 0}
            className="w-full"
          />
          {productos.length > 0 && (
            <div className="text-xs text-gray-500 mt-1">
              {(() => {
                if (hostessLimits.hasChampagne) {
                  if (hostessLimits.otherCommissionQuantity > 0) {
                    return `💎 Champaña (tope ${hostessLimits.champagneLimit}) + ${hostessLimits.otherCommissionQuantity} trago${hostessLimits.otherCommissionQuantity !== 1 ? 's' : ''} con comisión: asigna anfitriona individual o deja vacío para repartir. Límite total ${maxAnfitrionasPermitidas}.`;
                  }
                  return `💎 Champaña detectada: Máximo ${maxAnfitrionasPermitidas} anfitriona${maxAnfitrionasPermitidas !== 1 ? 's' : ''} (comisión repartida entre todas)`;
                }

                if (hostessLimits.otherCommissionQuantity > 0) {
                  return `🍹 ${hostessLimits.otherCommissionQuantity} producto${hostessLimits.otherCommissionQuantity !== 1 ? 's' : ''} con comisión: Máximo ${maxAnfitrionasPermitidas} anfitriona${maxAnfitrionasPermitidas !== 1 ? 's' : ''} (comisión repartida entre todas)`;
                }

                return `ℹ️ Productos sin comisión: No se permiten anfitrionas`;
              })()}
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="text-center text-red-500 text-sm mb-2">{error}</div>
      )}
      <OrderTotalHeader total={total} onSubmit={handleSubmit} />
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
          hasChampagne={hostessLimits.hasChampagne}
          productos={productos}
          onRemoveProducto={onRemoveProducto}
          onUpdateCantidad={handleUpdateCantidad}
          onToggleComision={handleToggleComision}
          hostessOptions={hostessOptions}
          onAssignHostess={handleAssignHostess}
          selectedHostesses={hostessOptions.filter(h => selectedAnfitrionas.includes(h.id))}
        />
      </div>
    </div>
  );
}
