'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { cargarConfiguraciones, valorDeConfig } from '@/hooks/shared/useConfigValue';

/**
 * El IVA vive en la caché compartida de `useConfigValue` en vez de traer
 * `/api/configurations` por su cuenta: este provider está en el layout raíz, así que su
 * `fetch` salía en **todas** las pantallas y era la segunda petición idéntica de cada carga
 * (medido en el dashboard, las dos salían en el mismo milisegundo).
 */
const IvaRateContext = createContext<number>(0.19);

export function IvaRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState(0.19);

  useEffect(() => {
    let vigente = true;
    // Reutiliza la descarga en curso si otro componente ya la pidió; si no, la lanza una vez.
    void cargarConfiguraciones().then(() => {
      if (!vigente) return;
      const pct = Number(valorDeConfig<string>('impuesto_iva', '19'));
      if (Number.isFinite(pct) && pct > 0) setRate(pct / 100);
    });
    return () => {
      vigente = false;
    };
  }, []);

  return <IvaRateContext.Provider value={rate}>{children}</IvaRateContext.Provider>;
}

export function useIvaRate() {
  return useContext(IvaRateContext);
}
