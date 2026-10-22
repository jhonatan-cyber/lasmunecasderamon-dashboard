'use client';

import { useState } from 'react';

interface Detalle {
  id?: string | number;
  producto_id: string | number;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
}

export function useCuentaFormLogic() {
  const [codigo, setCodigo] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [habitacionId, setHabitacionId] = useState('');
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [loading, setLoading] = useState(false);

  const calculateSubTotal = () => {
    return detalles.reduce((sum, det) => sum + (det.sub_total || 0), 0);
  };

  const calculateTotalComision = () => {
    return detalles.reduce((sum, det) => sum + (det.comision || 0) * det.cantidad, 0);
  };

  const calculateTotal = () => {
    const subTotal = calculateSubTotal();
    const comisiones = calculateTotalComision();
    return subTotal + comisiones;
  };

  const addDetalle = (detalle: Detalle) => {
    if (detalle.cantidad <= 0 || detalle.precio <= 0) {
      return false;
    }

    const existente = detalles.findIndex(d => d.producto_id === detalle.producto_id);

    if (existente !== -1) {
      const nuevosDetalles = [...detalles];
      nuevosDetalles[existente].cantidad += detalle.cantidad;
      nuevosDetalles[existente].sub_total =
        nuevosDetalles[existente].precio * nuevosDetalles[existente].cantidad;
      setDetalles(nuevosDetalles);
    } else {
      setDetalles([...detalles, { ...detalle, id: Date.now() }]);
    }

    return true;
  };

  const updateDetalle = (index: number, detalle: Partial<Detalle>) => {
    const nuevosDetalles = [...detalles];
    nuevosDetalles[index] = { ...nuevosDetalles[index], ...detalle };

    if (detalle.cantidad || detalle.precio) {
      const precio = detalle.precio ?? nuevosDetalles[index].precio;
      const cantidad = detalle.cantidad ?? nuevosDetalles[index].cantidad;
      nuevosDetalles[index].sub_total = precio * cantidad;
    }

    setDetalles(nuevosDetalles);
  };

  const removeDetalle = (index: number) => {
    setDetalles(detalles.filter((_, i) => i !== index));
  };

  const validateForm = (): boolean => {
    if (!codigo.trim()) {
      return false;
    }
    if (!clienteId) {
      return false;
    }
    if (detalles.length === 0) {
      return false;
    }
    if (detalles.some(d => d.cantidad <= 0 || d.precio <= 0)) {
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setCodigo('');
    setClienteId('');
    setHabitacionId('');
    setDetalles([]);
    setLoading(false);
  };

  const getFormData = () => {
    return {
      codigo,
      cliente_id: clienteId,
      habitacion_id: habitacionId || null,
      sub_total: calculateSubTotal(),
      total_comision: calculateTotalComision(),
      total: calculateTotal(),
      detalles
    };
  };

  return {
    codigo,
    clienteId,
    habitacionId,
    detalles,
    loading,

    setCodigo,
    setClienteId,
    setHabitacionId,
    setDetalles,
    setLoading,

    subTotal: calculateSubTotal(),
    totalComision: calculateTotalComision(),
    total: calculateTotal(),

    addDetalle,
    updateDetalle,
    removeDetalle,
    validateForm,
    resetForm,
    getFormData,

    calculateSubTotal,
    calculateTotalComision,
    calculateTotal
  };
}
