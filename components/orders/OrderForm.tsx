import { useState, useRef, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import OrderProductTable from './OrderProductTable';
import CustomerSelect from '@/components/ui/CustomerSelect';
import HostessSelect from '@/components/ui/HostessSelect';
import OrderTotalHeader from '@/components/orders/OrderTotalHeader';
import CategoryCardList from '@/components/ui/CategoryCardList';
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils';
import { formatCurrencyNoDecimals } from '@/lib/formatters';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import useRooms from '@/hooks/habitaciones/useRooms';
import RoomSelect from '../ui/RoomSelect';

// Lazy load del modal de productos para reducir bundle inicial
const CategoryProductsModal = dynamic(
  () => import('@/components/orders/CategoryProductsModal'),
  {
    loading: () => (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Cargando productos...</p>
        </div>
      </div>
    ),
    ssr: false
  }
);

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
  onSubmit
}: OrderFormProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<any>(null);
  const [productosCategoria, setProductosCategoria] = useState<any[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [roomSelections, setRoomSelections] = useState<{ [key: string]: string }>({});
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const [propina, setPropina] = useState(10);
  const [propinaHabilitada, setPropinaHabilitada] = useState(false);
  const [error, setError] = useState('');

  // Memoizar el cálculo del subtotal para evitar recálculos innecesarios
  const subtotal = useMemo(() => {
    return productos.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  }, [productos]);

  // Memoizar el cálculo de la propina
  const tipAmount = useMemo(() => {
    return propinaHabilitada ? (subtotal * propina) / 100 : 0;
  }, [propinaHabilitada, subtotal, propina]);

  // Memoizar el cálculo del total
  const total = useMemo(() => {
    return subtotal + tipAmount;
  }, [subtotal, tipAmount]);

  // Manejar cambios en la propina desde OrderTotalHeader
  const handleTipChange = useCallback((enabled: boolean, percentage: number) => {
    setPropinaHabilitada(enabled);
    setPropina(percentage);
  }, []);
  
  const router = useRouter();
  const { user } = useCurrentUser();
  const { rooms } = useRooms();

  const handleOpenCategoria = useCallback(async (cat: any) => {
    setModalCategoria(cat);
    setModalOpen(true);
    setLoadingProductos(true);
    try {
      const res = await fetch(`/api/products?category_id=${cat.id_categoria || cat.id}`);
      const data = await res.json();
      if (data.success) setProductosCategoria(data.data);
      else setProductosCategoria([]);
    } catch {
      setProductosCategoria([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  const handleCantidadChange = useCallback((id: string, value: string) => {
    const num = parseInt(value, 10);
    setCantidades(prev => ({ ...prev, [id]: isNaN(num) ? 1 : num }));
  }, []);

  const handleChampagneHostessChange = useCallback((productId: string, hostessIds: string[]) => {
    setChampagneHostessSelections(prev => ({
      ...prev,
      [productId]: hostessIds
    }));
  }, []);

  const handleOtherProductHostessChange = useCallback((productId: string, hostessIds: string[]) => {
    setOtherProductHostessSelections(prev => ({
      ...prev,
      [productId]: hostessIds
    }));
  }, []);

  const handleRoomChange = useCallback((productId: string, roomId: string) => {
    setRoomSelections(prev => ({
      ...prev,
      [productId]: roomId
    }));
  }, []);

  const handleAgregarProducto = useCallback((producto: any) => {
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
        hostessId: '', // anfitriona asignada para la comisión
        selectedHostesses: producto.selectedHostesses || [], // Anfitrionas seleccionadas en el modal
        isChampagne: producto.isChampagne || false, // Si es champaña
        selectedRoom: producto.selectedRoom || null, // Habitación seleccionada
        requiresRoom: producto.requiresRoom || false // Si requiere habitación
      });
    }
    setCantidades(prev => ({
      ...prev,
      [producto.id_producto || producto.id]: 1
    }));

    // Limpiar selecciones del modal después de agregar
    const productId = String(producto.id_producto || producto.id);
    setChampagneHostessSelections(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
    setOtherProductHostessSelections(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
    setRoomSelections(prev => {
      const newState = { ...prev };
      delete newState[productId];
      return newState;
    });
  }, [cantidades, onAddProducto]);

  const handleUpdateCantidad = useCallback((index: number, nuevaCantidad: number) => {
    if (onUpdateCantidad) {
      onUpdateCantidad(index, nuevaCantidad);
    }
  }, [onUpdateCantidad]);

  const handleAssignHostess = useCallback((index: number, hostessId: string) => {
    onAssignHostess?.(index, hostessId);
  }, [onAssignHostess]);

  const handleToggleComision = useCallback((index: number) => {
    // Usar la función pasada desde el padre si existe
    if (onToggleComision) {
      onToggleComision(index);
    }
  }, [onToggleComision]);

  const generarCodigoPedido = useCallback(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  const handleSubmit = async () => {
    // Cliente es opcional, no validamos que esté seleccionado

    if (productos.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    // Verificar que todas las bebidas con comisión tengan anfitrionas asignadas
    const bebidasConComision = productos.filter(p => p.generaComision === 1);

    for (const bebida of bebidasConComision) {
      if (!bebida.selectedHostesses || bebida.selectedHostesses.length === 0) {
        setError(
          `La bebida "${bebida.nombre || bebida.name}" debe tener al menos una anfitriona asignada`
        );
        return;
      }
    }

    // Si no hay productos con comisión, no validamos anfitrionas
    const hayProductosParaChicas = bebidasConComision.length > 0;

    const isChampagneProduct = (p: any) => {
      const cat = (p.categoria || p.category_name || '').toLowerCase();
      return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
    };

    // Validar que no haya conflictos entre asignaciones de anfitrionas
    const todasLasAnfitrionasAsignadas = bebidasConComision.flatMap(p => p.selectedHostesses || []);
    const anfitrionasUnicas = Array.from(new Set(todasLasAnfitrionasAsignadas));

    // Para champañas: pueden compartir anfitrionas entre sí
    // Para bebidas no-champaña: cada una debe tener anfitrionas únicas
    const champagnes = bebidasConComision.filter(isChampagneProduct);
    const bebidasNoChampagne = bebidasConComision.filter(p => !isChampagneProduct(p));

    // Validar que bebidas no-champaña no compartan anfitrionas entre sí
    const anfitrionasBebidasNoChampagne = bebidasNoChampagne.flatMap(
      p => p.selectedHostesses || []
    );
    const anfitrionasUnicasBebidasNoChampagne = Array.from(new Set(anfitrionasBebidasNoChampagne));

    if (anfitrionasBebidasNoChampagne.length !== anfitrionasUnicasBebidasNoChampagne.length) {
      setError(
        'Cada bebida (no champaña) debe tener anfitrionas únicas. No pueden compartir anfitrionas entre bebidas diferentes.'
      );
      return;
    }

    // Validar que anfitrionas de bebidas no-champaña no estén asignadas a champañas
    const anfitrionasChampagnes = champagnes.flatMap(p => p.selectedHostesses || []);
    const conflictos = anfitrionasUnicasBebidasNoChampagne.filter(hostessId =>
      anfitrionasChampagnes.includes(hostessId)
    );

    if (conflictos.length > 0) {
      setError(
        'Las anfitrionas asignadas a bebidas no pueden estar asignadas también a champañas en el mismo pedido.'
      );
      return;
    }
    // Si NO hay champaña o no hay asignaciones, la comisión se reparte entre todas

    // Validar límites de anfitrionas por producto
    for (const producto of bebidasConComision) {
      if (isChampagneProduct(producto)) {
        // Para champañas: validar límite según precio
        const precio = Number(producto.precio || producto.price || 0);
        let champagneLimit = 1;

        if (precio >= 240000) champagneLimit = 5;
        else if (precio >= 200000) champagneLimit = 4;
        else if (precio >= 140000) champagneLimit = 3;
        else if (precio >= 120000) champagneLimit = 2;

        if (producto.selectedHostesses.length > champagneLimit) {
          setError(
            `La champaña "${producto.nombre || producto.name}" excede el límite de ${champagneLimit} anfitriona${champagneLimit !== 1 ? 's' : ''} para su precio de ${formatCurrencyNoDecimals(precio)}`
          );
          return;
        }
      } else {
        // Para bebidas no-champaña: máximo 1 anfitriona por cantidad
        const maxAnfitrionas = Number(producto.cantidad || 1);
        if (producto.selectedHostesses.length > maxAnfitrionas) {
          setError(
            `La bebida "${producto.nombre || producto.name}" puede tener máximo ${maxAnfitrionas} anfitriona${maxAnfitrionas !== 1 ? 's' : ''} (según su cantidad)`
          );
          return;
        }
      }
    }

    if (!user?.id) {
      setError('No se pudo identificar al usuario actual (mesero)');
      return;
    }

    setError('');

    try {
      const codigo = generarCodigoPedido();
      const subtotal = productos.reduce((sum, item) => sum + (item.subtotal || 0), 0);
      const totalComision = productos.reduce((sum, item) => sum + (item.comision || 0), 0);
      const total = subtotal;
      const detalles = productos.map(item => ({
        productoId: Number(item.id_producto || item.id),
        cantidad: Number(item.cantidad),
        precio: Number(item.precio || item.price),
        subtotal: Number(item.subtotal),
        comision: Number(item.comision || 0),
        generaComision: Number(item.generaComision ?? 1), // Por defecto 1 (genera comisión)
        hostessId:
          item.selectedHostesses && item.selectedHostesses.length === 1
            ? Number(item.selectedHostesses[0])
            : null, // Solo para bebidas con comisión individual
        selectedHostesses: item.selectedHostesses || [], // Para champañas con múltiples anfitrionas
        roomId: item.selectedRoom ? Number(item.selectedRoom) : null // Habitación seleccionada
      }));
      const usuarios = Array.from(
        new Set(bebidasConComision.flatMap(p => p.selectedHostesses || []))
      ).map(id => ({ usuarioId: Number(id) }));

      const payload = {
        codigo,
        meseroId: Number(user.id),
        clienteId: selectedCliente ? Number(selectedCliente) : null, // NULL si no hay cliente
        subtotal: Number(subtotal),
        total: Number(total), // El total ya incluye la propina calculada
        propina: Number(tipAmount), // Enviar el monto de la propina, no el porcentaje
        totalComision: Number(totalComision),
        detalles,
        usuarios
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.status === 201 && data.success) {
        showSuccessToast('¡Pedido generado exitosamente!');
        window.dispatchEvent(new CustomEvent('updatePendingOrders'));
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        // Limpiar formularios
        setSelectedCliente('');
        // Limpiar selecciones del modal
        setChampagneHostessSelections({});
        setOtherProductHostessSelections({});
        setRoomSelections({});
        // Redirigir a la lista de pedidos después de un pequeño delay
        setTimeout(() => {
          router.push('/orders');
        }, 1500);
        if (onSubmit) onSubmit();
      } else {
        showErrorToast(data.message || 'Error al generar el pedido');
      }
    } catch (err) {
      showErrorToast('Error inesperado al generar el pedido');
    }
  };

  return (
    <div className='space-y-8'>
      {/* Categorías activas */}
      <CategoryCardList
        categorias={categorias}
        onSelect={handleOpenCategoria}
        filter={(c: any) => c.status === 1 && (c.total_products || 0) > 0}
      />

      <div className='flex flex-col md:flex-row gap-6 mb-6'>
        <div className='flex-1'>
          <CustomerSelect
            clientes={clientes}
            value={selectedCliente}
            onChange={setSelectedCliente}
            label='Cliente (Opcional)'
            placeholder='Sin cliente seleccionado'
            required={false}
            className='w-full'
          />
        </div>
      </div>
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
        anfitrionas={anfitrionas}
        champagneHostessSelections={champagneHostessSelections}
        onChampagneHostessChange={handleChampagneHostessChange}
        otherProductHostessSelections={otherProductHostessSelections}
        onOtherProductHostessChange={handleOtherProductHostessChange}
        productosEnCarrito={productos}
        habitaciones={rooms}
        roomSelections={roomSelections}
        onRoomChange={handleRoomChange}
      />
      {/* Mensaje de error */}
      {error && (
        <div className='bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm'>
          {error}
        </div>
      )}
      {/* Total y botón de generar pedido */}
      <OrderTotalHeader
        total={total}
        subtotal={subtotal}
        onSubmit={handleSubmit}
        tipPercentage={propina}
        tipEnabled={propinaHabilitada}
        onTipChange={handleTipChange}
      />
      {/* Tabla de productos */}
      <div className='mt-8'>
        <div className='text-center text-gray-400 text-sm mb-2'>Detalles Producto</div>
        <OrderProductTable
          productos={productos}
          onRemoveProducto={onRemoveProducto}
          onUpdateCantidad={handleUpdateCantidad}
          onToggleComision={handleToggleComision}
          onAssignHostess={handleAssignHostess}
          anfitrionas={anfitrionas}
          habitaciones={rooms}
        />
      </div>
    </div>
  );
}
