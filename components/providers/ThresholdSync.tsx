'use client';

import { useEffect } from 'react';
import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { setServiceLevels, setCardSplit } from '@/components/orders/productModalRules';

/**
 * Sincroniza configs → runtime en un solo lugar.
 * Fuente única para niveles por precio: simple_hasta / anfitriona / habitacion.
 * `threshold_producto_caro` quedó deprecado (alias de habitacionDesde, ver API).
 */
export function ThresholdSync() {
  const simpleHasta = Number(useConfigValue('comisiones', 'umbral_simple_hasta', '10000'));
  const hostessDesde = Number(useConfigValue('comisiones', 'umbral_anfitriona_desde', '20000'));
  const habitacionDesde = Number(useConfigValue('comisiones', 'umbral_habitacion_desde', '30000'));
  const splitVenta = Number(useConfigValue('comisiones', 'split_tarjeta_venta', '51'));
  const splitPropina = Number(useConfigValue('comisiones', 'split_tarjeta_propina', '49'));

  useEffect(() => {
    setServiceLevels({ simpleHasta, hostessDesde, habitacionDesde });
  }, [simpleHasta, hostessDesde, habitacionDesde]);

  useEffect(() => {
    if (Number.isFinite(splitVenta) && Number.isFinite(splitPropina)) {
      setCardSplit(splitVenta / 100, splitPropina / 100);
    }
  }, [splitVenta, splitPropina]);

  return null;
}
