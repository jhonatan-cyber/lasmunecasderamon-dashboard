import { useMemo, useCallback } from 'react';

interface ServicePricingParams {
  precioServicio: number;
  precioHabitacion: number;
  metodoPago: string;
  tiempo: number;
  numAnfitrionas: number;
}

export function useServicePricing({
  precioServicio,
  precioHabitacion,
  metodoPago,
  tiempo,
  numAnfitrionas
}: ServicePricingParams) {
  const multiplicadorTiempo = useMemo(() => tiempo === 60 ? 2 : 1, [tiempo]);

  const calculateIVA = useCallback((
    precioServicio: number,
    metodoPago: string,
    numAnfitrionas: number,
    precioHabitacion: number
  ) => {
    if (metodoPago === 'tarjeta') {
      const nuevoSubTotal = precioServicio * numAnfitrionas;
      const precioHabitacionTotal = precioHabitacion * numAnfitrionas;

      let nuevoIVA = Math.floor(nuevoSubTotal * 0.20);
      let nuevoTotal = nuevoSubTotal + precioHabitacionTotal + nuevoIVA;

      const totalRedondeado = Math.ceil(nuevoTotal / 5000) * 5000;
      const excedente = totalRedondeado - nuevoTotal;

      nuevoIVA = nuevoIVA + excedente;

      return nuevoIVA;
    }
    return 0;
  }, []);

  const precioServicioTotal = useMemo(
    () => (precioServicio * numAnfitrionas) * multiplicadorTiempo,
    [precioServicio, numAnfitrionas, multiplicadorTiempo]
  );

  const precioHabitacionTotal = useMemo(
    () => (precioHabitacion * numAnfitrionas) * multiplicadorTiempo,
    [precioHabitacion, numAnfitrionas, multiplicadorTiempo]
  );

  const iva = useMemo(
    () => calculateIVA(
      precioServicio * multiplicadorTiempo,
      metodoPago,
      numAnfitrionas,
      precioHabitacion * multiplicadorTiempo
    ),
    [precioServicio, metodoPago, numAnfitrionas, precioHabitacion, multiplicadorTiempo, calculateIVA]
  );

  const subTotal = useMemo(() => precioServicioTotal, [precioServicioTotal]);

  const total = useMemo(() => {
    let calculatedTotal = subTotal + precioHabitacionTotal + iva;
    if (metodoPago === 'tarjeta') {
      calculatedTotal = Math.ceil((subTotal + precioHabitacionTotal + Math.floor(subTotal * 0.20)) / 5000) * 5000;
    }
    return calculatedTotal;
  }, [subTotal, precioHabitacionTotal, iva, metodoPago]);

  return {
    precioServicioTotal,
    precioHabitacionTotal,
    iva,
    subTotal,
    total,
    multiplicadorTiempo
  };
}
