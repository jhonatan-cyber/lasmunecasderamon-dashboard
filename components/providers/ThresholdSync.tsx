'use client';

import { useConfigValue } from '@/hooks/shared/useConfigValue';
import { setExpensiveDrinkThreshold, setCardSplit } from '@/components/orders/productModalRules';
import { useEffect } from 'react';

export function ThresholdSync() {
  const threshold = Number(useConfigValue('comisiones', 'threshold_producto_caro', '30000'));
  const splitVenta = Number(useConfigValue('comisiones', 'split_tarjeta_venta', '51'));
  const splitPropina = Number(useConfigValue('comisiones', 'split_tarjeta_propina', '49'));

  useEffect(() => {
    setExpensiveDrinkThreshold(threshold);
  }, [threshold]);

  useEffect(() => {
    setCardSplit(splitVenta / 100, splitPropina / 100);
  }, [splitVenta, splitPropina]);

  return null;
}
