'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const IvaRateContext = createContext<number>(0.19);

export function IvaRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState(0.19);

  useEffect(() => {
    fetch('/api/configurations')
      .then(r => r.json())
      .then(result => {
        if (result.success && result.data?.facturacion?.impuesto_iva) {
          const pct = Number(result.data.facturacion.impuesto_iva);
          if (pct > 0) setRate(pct / 100);
        }
      })
      .catch(() => {
        /* keep default */
      });
  }, []);

  return <IvaRateContext.Provider value={rate}>{children}</IvaRateContext.Provider>;
}

export function useIvaRate() {
  return useContext(IvaRateContext);
}
