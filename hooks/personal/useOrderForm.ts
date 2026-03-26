import { useState, useMemo, useCallback } from 'react';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import { useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/auth/useCurrentUser';
import useRooms from '@/hooks/habitaciones/useRooms';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toastUtils';
import { formatCurrencyNoDecimals } from '@/lib/utils/formatters';

export type OrderProducto = {
  id_producto?: string | number;
  id?: string | number;
  id_categoria?: string | number;
  precio?: number;
  price?: number;
  comision?: number;
  commission?: number;
  cantidad?: number;
  subtotal?: number;
  generaComision?: number;
  selectedHostesses?: string[];
  isChampagne?: boolean;
  selectedRoom?: string | null;
  requiresRoom?: boolean;
  nombre?: string;
  name?: string;
  categoria?: string;
  category_name?: string;
};

export type OrderCategory = {
  id_categoria?: number;
  id?: number;
  nombre?: string;
  name?: string;
  status?: number;
  total_products?: number | null;
};

export type OrderProductoPayload = OrderProducto & {
  comision: number;
  comisionUnitaria: number;
  cantidad: number;
  subtotal: number;
  generaComision: number;
  hostessId: string;
  selectedHostesses: string[];
  isChampagne: boolean;
  selectedRoom: string | null;
  requiresRoom: boolean;
};

interface UseOrderFormProps {
  productos: Array<OrderProducto>;
  selectedCliente: string;
  setSelectedCliente: (v: string) => void;
  onAddProducto?: (producto: OrderProductoPayload) => void;
  onUpdateCantidad?: (index: number, nuevaCantidad: number) => void;
  onAssignHostess?: (index: number, hostessId: string) => void;
  onToggleComision?: (index: number) => void;
  onSubmit?: () => void;
}

export function useOrderForm({
  productos,
  selectedCliente,
  setSelectedCliente,
  onAddProducto,
  onUpdateCantidad,
  onAssignHostess,
  onToggleComision,
  onSubmit
}: UseOrderFormProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCategoria, setModalCategoria] = useState<OrderCategory | null>(null);
  const [productosCategoria, setProductosCategoria] = useState<OrderProducto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [cantidades, setCantidades] = useState<{ [key: string]: number }>({});
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{ [key: string]: string[] }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{ [key: string]: string[] }>({});
  const [roomSelections, setRoomSelections] = useState<{ [key: string]: string }>({});
  const [propina, setPropina] = useState(10);
  const [propinaHabilitada, setPropinaHabilitada] = useState(false);
  const [error, setError] = useState('');

  const router = useRouter();
  const { user } = useCurrentUser();
  const { rooms, fetchRooms } = useRooms();

  const subtotal = useMemo(() => productos.reduce((acc, p) => acc + (p.subtotal || 0), 0), [productos]);
  const tipAmount = useMemo(() => (propinaHabilitada ? (subtotal * propina) / 100 : 0), [propinaHabilitada, subtotal, propina]);
  const total = useMemo(() => subtotal + tipAmount, [subtotal, tipAmount]);

  const handleTipChange = useCallback((enabled: boolean, percentage: number) => {
    setPropinaHabilitada(enabled);
    setPropina(percentage);
  }, []);

  const handleOpenCategoria = useCallback(async (cat: OrderCategory) => {
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
    setChampagneHostessSelections(prev => ({ ...prev, [productId]: hostessIds }));
  }, []);

  const handleOtherProductHostessChange = useCallback((productId: string, hostessIds: string[]) => {
    setOtherProductHostessSelections(prev => ({ ...prev, [productId]: hostessIds }));
  }, []);

  const handleRoomChange = useCallback((productId: string, roomId: string) => {
    setRoomSelections(prev => ({ ...prev, [productId]: roomId }));
  }, []);

  const handleAgregarProducto = useCallback((producto: OrderProducto) => {
    const productKey = String(producto.id_producto || producto.id || '');
    const cantidad = cantidades[productKey] || 1;
    const comisionUnitaria = producto.comision ?? producto.commission ?? 0;
    const generaComision = comisionUnitaria > 0 ? 1 : 0;
    const selectedHostesses = producto.selectedHostesses || [];

    if (onAddProducto) {
      onAddProducto({
        ...producto,
        comision: comisionUnitaria * cantidad,
        comisionUnitaria,
        cantidad,
        subtotal: Number(producto.precio || producto.price || 0) * cantidad,
        generaComision,
        hostessId: '',
        selectedHostesses,
        isChampagne: producto.isChampagne || false,
        selectedRoom: producto.selectedRoom || null,
        requiresRoom: producto.requiresRoom || false
      });
    }

    setCantidades(prev => ({ ...prev, [productKey]: 1 }));
    setChampagneHostessSelections(prev => { const n = { ...prev }; delete n[productKey]; return n; });
    setOtherProductHostessSelections(prev => { const n = { ...prev }; delete n[productKey]; return n; });
    setRoomSelections(prev => { const n = { ...prev }; delete n[productKey]; return n; });
  }, [cantidades, onAddProducto]);

  const handleSubmitInternal = async () => {
    if (productos.length === 0) {
      setError('Debe agregar al menos un producto');
      return;
    }

    const bebidasConComision = productos.filter(p => p.generaComision === 1);
    for (const bebida of bebidasConComision) {
      if ((bebida.selectedHostesses || []).length === 0) {
        setError(`La bebida "${bebida.nombre || bebida.name}" debe tener al menos una anfitriona asignada`);
        return;
      }
    }

    const isChampagneProduct = (p: OrderProducto) => {
      const cat = (p.categoria || p.category_name || '').toLowerCase();
      return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
    };

    const anfitrionasUnicasBebidasNoChampagne = Array.from(new Set(bebidasConComision.filter(p => !isChampagneProduct(p)).flatMap(p => p.selectedHostesses || [])));
    const anfitrionasBebidasNoChampagne = bebidasConComision.filter(p => !isChampagneProduct(p)).flatMap(p => p.selectedHostesses || []);

    if (anfitrionasBebidasNoChampagne.length !== anfitrionasUnicasBebidasNoChampagne.length) {
      setError('Cada bebida (no champaña) debe tener anfitrionas únicas.');
      return;
    }

    const anfitrionasChampagnes = bebidasConComision.filter(isChampagneProduct).flatMap(p => p.selectedHostesses || []);
    if (anfitrionasUnicasBebidasNoChampagne.some(id => anfitrionasChampagnes.includes(id))) {
      setError('Las anfitrionas asignadas a bebidas no pueden estar asignadas también a champañas.');
      return;
    }

    for (const producto of bebidasConComision) {
      if (isChampagneProduct(producto)) {
        const precio = Number(producto.precio || producto.price || 0);
        let limit = 1;
        if (precio >= 240000) limit = 5;
        else if (precio >= 200000) limit = 4;
        else if (precio >= 140000) limit = 3;
        else if (precio >= 120000) limit = 2;
        if ((producto.selectedHostesses || []).length > limit) {
          setError(`La champaña "${producto.nombre || producto.name}" excede el límite de ${limit}`);
          return;
        }
      } else {
        const max = Number(producto.cantidad || 1);
        if ((producto.selectedHostesses || []).length > max) {
          setError(`La bebida "${producto.nombre || producto.name}" puede tener máximo ${max}`);
          return;
        }
      }
    }

    if (!user?.id) {
      setError('No se pudo identificar al mesero');
      return;
    }

    setError('');
    try {
      const payload = {
        codigo: generateRandomCode(),
        meseroId: Number(user.id),
        clienteId: selectedCliente ? Number(selectedCliente) : null,
        subtotal, total: subtotal, propina: tipAmount,
        totalComision: productos.reduce((sum, item) => sum + (item.comision || 0), 0),
        detalles: productos.map(item => ({
          productoId: Number(item.id_producto || item.id),
          cantidad: Number(item.cantidad),
          precio: Number(item.precio || item.price),
          subtotal: Number(item.subtotal),
          comision: Number(item.comision || 0),
          generaComision: Number(item.generaComision ?? 1),
          hostessId: (item.selectedHostesses || []).length === 1 ? Number((item.selectedHostesses || [])[0]) : null,
          selectedHostesses: item.selectedHostesses || [],
          roomId: item.selectedRoom ? Number(item.selectedRoom) : null
        })),
        usuarios: Array.from(new Set(bebidasConComision.flatMap(p => p.selectedHostesses || []))).map(id => ({ usuarioId: Number(id) }))
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.status === 201 && data.success) {
        showSuccessToast('¡Pedido generado exitosamente!');
        if (data.habitacion_auto_seleccionada) {
          await fetchRooms();
          window.dispatchEvent(new CustomEvent('refreshRooms', { detail: { roomId: data.habitacion_auto_seleccionada } }));
        }
        window.dispatchEvent(new CustomEvent('updatePendingOrders'));
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
        setSelectedCliente('');
        setChampagneHostessSelections({});
        setOtherProductHostessSelections({});
        setRoomSelections({});
        setTimeout(() => router.push('/orders'), 1500);
        if (onSubmit) onSubmit();
      } else {
        showErrorToast(data.message || 'Error al generar el pedido');
      }
    } catch (err) {
      showErrorToast('Error inesperado al generar el pedido');
    }
  };

  return {
    modalOpen, setModalOpen,
    modalCategoria,
    productosCategoria,
    loadingProductos,
    cantidades,
    champagneHostessSelections,
    otherProductHostessSelections,
    roomSelections,
    propina,
    propinaHabilitada,
    error,
    subtotal,
    tipAmount,
    total,
    rooms,
    handleTipChange,
    handleOpenCategoria,
    handleCantidadChange,
    handleChampagneHostessChange,
    handleOtherProductHostessChange,
    handleRoomChange,
    handleAgregarProducto,
    handleSubmitInternal
  };
}
