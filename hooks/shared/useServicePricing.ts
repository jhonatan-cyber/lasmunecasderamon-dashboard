import { useMemo } from 'react';

interface ServicePricingParams {
  precioServicio: number;
  precioHabitacion: number;
  metodoPago: string;
  tiempo: number;
  numAnfitrionas: number;
}

const getTiempoMultiplier = (tiempo: number) => (tiempo === 60 ? 2 : 1);

const roundToNearest5000 = (value: number) => Math.ceil(value / 5000) * 5000;

const calculateTarjetaIva = (subtotal: number, precioHabitacionTotal: number) => {
  const ivaBase = Math.floor(subtotal * 0.2);
  const totalBase = subtotal + precioHabitacionTotal + ivaBase;
  const totalRedondeado = roundToNearest5000(totalBase);
  return ivaBase + (totalRedondeado - totalBase);
};

export function useServicePricing({
  precioServicio,
  precioHabitacion,
  metodoPago,
  tiempo,
  numAnfitrionas
}: ServicePricingParams) {
  const multiplicadorTiempo = useMemo(() => getTiempoMultiplier(tiempo), [tiempo]);

  const precioServicioBase = precioServicio * numAnfitrionas;
  const precioHabitacionBase = precioHabitacion * numAnfitrionas;

  const precioServicioTotal = useMemo(
    () => precioServicioBase * multiplicadorTiempo,
    [precioServicioBase, multiplicadorTiempo]
  );

  const precioHabitacionTotal = useMemo(
    () => precioHabitacionBase * multiplicadorTiempo,
    [precioHabitacionBase, multiplicadorTiempo]
  );

  const iva = useMemo(
    () =>
      metodoPago === 'tarjeta'
        ? calculateTarjetaIva(precioServicioTotal, precioHabitacionTotal)
        : 0,
    [metodoPago, precioServicioTotal, precioHabitacionTotal]
  );

  const subTotal = precioServicioTotal;

  const total = useMemo(() => {
    const rawTotal = subTotal + precioHabitacionTotal + iva;
    return metodoPago === 'tarjeta' ? roundToNearest5000(rawTotal) : rawTotal;
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

