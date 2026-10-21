'use client';

import { useCallback, useEffect, useState } from 'react';

export function usePersistentTab<T extends string>(
  clave: string,
  validos: readonly T[],
  porDefecto: T
): [T, (valor: T) => void] {
  const [tab, setTab] = useState<T>(porDefecto);

  useEffect(() => {
    try {
      const guardado = window.localStorage.getItem(clave);
      if (guardado && (validos as readonly string[]).includes(guardado)) {
        setTab(guardado as T);
      }
    } catch {}
  }, [clave, validos]);

  const seleccionar = useCallback(
    (valor: T) => {
      setTab(valor);
      try {
        window.localStorage.setItem(clave, valor);
      } catch {}
    },
    [clave]
  );

  return [tab, seleccionar];
}
