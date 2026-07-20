'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCuentas } from '@/hooks/caja/useCuentas';
import { CreateCuentaRequest, CreateDetalleCuentaRequest } from '@/types/cuenta';
import { generateRandomCode } from '@/lib/utils/codeUtils';
import { useChampagneRule } from '@/hooks/shared';
import logger from '@/lib/utils/logger';

export function useAccountForm() {
  const { createCuenta } = useCuentas();
  const [loading, setLoading] = useState(false);

  const [selectedCliente, setSelectedCliente] = useState('');
  const [selectedAnfitrionas, setSelectedAnfitrionas] = useState<string[]>([]);
  const [selectedHabitacion, setSelectedHabitacion] = useState('');
  const [productos, setProductos] = useState<any[]>([]);
  const [searchProducto, setSearchProducto] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  const [selectedTime, setSelectedTime] = useState(60);

  useEffect(() => {
    const searchProducts = async () => {
      if (!searchProducto.trim()) {
        setSearchResults([]);
        return;
      }

      setSearchLoading(true);
      try {
        const res = await fetch(`/api/products?term=${encodeURIComponent(searchProducto)}`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(data.success ? data.data : []);
      } catch (error) {
        logger.captureException(error, { context: 'AccountForm:searchProducts' });
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchProducts, 300);
    return () => clearTimeout(timeoutId);
  }, [searchProducto]);

  const calculateTotal = () => productos.reduce((sum, p) => sum + p.subtotal, 0);

  const { isChampagneProduct, hasChampagneProducts, maxChampagnePrice, maxAnfitrionas } =
    useChampagneRule(productos, selectedAnfitrionas, setSelectedAnfitrionas);

  const hasCommissionProducts = Array.isArray(productos)
    ? productos.some(p => (p.comision ?? p.commission ?? 0) > 0)
    : false;

  useEffect(() => {
    if (!hasCommissionProducts && selectedAnfitrionas.length > 0) {
      setSelectedAnfitrionas([]);
    }
  }, [hasCommissionProducts, selectedAnfitrionas.length, setSelectedAnfitrionas]);

  const handleCantidadChange = (id: string, value: string) => {
    setCantidades(prev => ({
      ...prev,
      [id]: parseInt(value) || 0
    }));
  };

  const handleAddProducto = (producto: any) => {
    const cantidad = cantidades[producto.id_producto] || 1;
    const precio = producto.precio || producto.price || 0;
    const comision = producto.commission ?? producto.comision ?? 0;

    setProductos(prev => {
      const existente = prev.findIndex(p => p.id_producto === producto.id_producto);
      if (existente !== -1) {
        return prev.map((p, i) =>
          i === existente
            ? {
                ...p,
                cantidad: p.cantidad + cantidad,
                subtotal: (p.cantidad + cantidad) * p.precio
              }
            : p
        );
      }
      return [...prev, { ...producto, cantidad, precio, comision, subtotal: precio * cantidad }];
    });

    setCantidades(prev => {
      const newCantidades = { ...prev };
      delete newCantidades[producto.id_producto];
      return newCantidades;
    });

    const nombreProducto = producto.nombre || producto.name || producto.product_name || 'Producto';
    toast.success(`${nombreProducto} agregado`);
  };

  const handleRemoveProducto = (index: number) => {
    setProductos(prev => prev.filter((_, i) => i !== index));
  };

  const handleCantidadChangeTable = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) return;

    setProductos(prev => {
      const nuevosProductos = [...prev];
      const producto = nuevosProductos[index];
      const precio = producto.precio || producto.price || 0;
      const comisionPorUnidad = producto.comision ?? 0;

      nuevosProductos[index] = {
        ...producto,
        cantidad: nuevaCantidad,
        subtotal: precio * nuevaCantidad,
        comision: comisionPorUnidad
      };
      return nuevosProductos;
    });
  };

  const handleClearSearch = () => {
    setSearchProducto('');
    setSearchResults([]);
    setSearchLoading(false);
  };

  const handleSubmit = async (
    clientes: any[],
    rooms: any[],
    startTimer: (
      cuentaId: string,
      habitacionId: string,
      habitacionName: string,
      time: number,
      timerKey: string,
      timerType: string,
      notes: string,
      transactionType: 'servicio' | 'venta' | 'cuenta'
    ) => void,
    onSuccess: () => void
  ) => {
    if (!selectedCliente || productos.length === 0) {
      toast.error('Cliente y al menos un producto son requeridos');
      return;
    }

    const clienteSeleccionado = clientes.find(
      c => String(c.id_cliente ?? c.id ?? '') === selectedCliente
    );
    if (
      clienteSeleccionado?.nombre?.toLowerCase().includes('genérico') ||
      clienteSeleccionado?.nombre?.toLowerCase().includes('generico')
    ) {
      toast.error('No se puede seleccionar un cliente genérico');
      return;
    }

    if (hasChampagneProducts && (!selectedAnfitrionas || selectedAnfitrionas.length === 0)) {
      toast.error('Debes seleccionar al menos una anfitriona cuando hay productos de champaña');
      return;
    }

    setLoading(true);
    try {
      const subTotal = calculateTotal();
      const totalComisionFinal = productos.reduce(
        (sum, p) => sum + (p.comision ?? 0) * p.cantidad,
        0
      );
      const total = calculateTotal();

      const detalles: CreateDetalleCuentaRequest[] = productos.map(producto => ({
        producto_id: producto.id_producto || producto.id,
        precio: producto.precio,
        cantidad: producto.cantidad,
        sub_total: producto.subtotal,
        comision: producto.comision ?? 0
      }));

      let timerMinutes = 0;
      let habitacionSeleccionada: any = null;
      if (selectedHabitacion) {
        habitacionSeleccionada = rooms.find(room => room.id.toString() === selectedHabitacion);
        if (habitacionSeleccionada) {
          const comision = habitacionSeleccionada.comision_anfitriona ?? 0;
          const roomTime = habitacionSeleccionada.time ?? habitacionSeleccionada.tiempo ?? 0;

          timerMinutes = comision > 0 ? roomTime || 60 : selectedTime;
        }
      }

      const cuentaData: CreateCuentaRequest = {
        codigo: generateRandomCode(),
        cliente_id: selectedCliente && selectedCliente !== 'none' ? selectedCliente : null,
        total_comision: totalComisionFinal,
        sub_total: subTotal,
        total: total,
        ...(selectedHabitacion && { habitacion_id: selectedHabitacion }),
        ...(timerMinutes > 0 && { tiempo: timerMinutes }),
        detalles,
        usuarios: selectedAnfitrionas
      };

      const result = await createCuenta(cuentaData);

      if (habitacionSeleccionada && timerMinutes > 0) {
        startTimer(
          String(result.id || 0),
          String(habitacionSeleccionada.id || 0),
          habitacionSeleccionada.name || habitacionSeleccionada.nombre || '',
          timerMinutes,
          `CUENTA_${result.id || Date.now()}`,
          'Cliente Cuenta',
          '',
          'cuenta' as const
        );
      }

      toast.success('Cuenta creada exitosamente');
      onSuccess();
    } catch (error) {
      logger.captureException(error, { context: 'AccountForm:handleSubmit' });
      toast.error(error instanceof Error ? error.message : 'Error al crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    selectedCliente,
    selectedAnfitrionas,
    selectedHabitacion,
    productos,
    searchProducto,
    searchResults,
    searchLoading,
    cantidades,

    hasChampagneProducts,
    hasCommissionProducts,
    maxChampagnePrice,
    maxAnfitrionas,
    total: calculateTotal(),

    selectedTime,
    setSelectedTime,

    setSelectedCliente,
    setSelectedAnfitrionas,
    setSelectedHabitacion,
    setProductos,
    setSearchProducto,
    setSearchResults,
    setCantidades,

    handleCantidadChange,
    handleAddProducto,
    handleRemoveProducto,
    handleCantidadChangeTable,
    handleClearSearch,
    handleSubmit,
    calculateTotal
  };
}
