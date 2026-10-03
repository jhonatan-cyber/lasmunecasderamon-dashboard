'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Pestaña que se recuerda entre recargas: al volver a la página se abre en la última que
 * estuvo visible y no siempre en la primera.
 *
 * La lectura ocurre en `useEffect` y no en el estado inicial a propósito: el HTML del
 * servidor y el del primer render del cliente tienen que coincidir o Next hydration
 * protesta. Durante la hidratación se ve el tab por defecto y, en cuanto monta, salta al
 * guardado.
 *
 * `validos` es la lista de pestañas de la página. Un valor guardado que ya no exista (un
 * tab eliminado o renombrado) cae al tab por defecto en vez de dejar la página en blanco.
 *
 * @param clave clave en `localStorage` (una por módulo con pestañas)
 * @param validos valores aceptados; referencia estable (módulo, no literal en cada render)
 * @param porDefecto pestaña con la que se abre la primera vez
 */
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
    } catch {
      // Sin localStorage (permisos o modo privado): se queda en la pestaña por defecto.
    }
  }, [clave, validos]);

  const seleccionar = useCallback(
    (valor: T) => {
      setTab(valor);
      try {
        window.localStorage.setItem(clave, valor);
      } catch {
        // Mismo caso que arriba: la sesión funciona igual, solo no se recuerda el tab.
      }
    },
    [clave]
  );

  return [tab, seleccionar];
}
