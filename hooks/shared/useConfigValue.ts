'use client';

import { useState, useEffect } from 'react';
import { definicionDe } from '@/modules/configuracion/contracts';

declare global {
  var __lmrConfigCache: Record<string, string | number | boolean> | undefined;
  var __lmrConfigEnCurso: Promise<void> | null | undefined;
  var __lmrConfigCargada: boolean | undefined;
  var __lmrConfigRefresco: Promise<void> | null | undefined;
}

const configCache: Record<string, string | number | boolean> = (globalThis.__lmrConfigCache ??= {});
const CONFIG_UPDATED = 'lmr:config-updated';

function ensureConfigs(): Promise<void> {
  if (globalThis.__lmrConfigCargada) return Promise.resolve();
  if (globalThis.__lmrConfigEnCurso) return globalThis.__lmrConfigEnCurso;
  globalThis.__lmrConfigEnCurso = (async () => {
    try {
      const res = await fetch('/api/configurations');
      const result = await res.json();
      if (res.ok && result.success && result.data) {
        const nuevos: typeof configCache = {};
        for (const category of Object.keys(result.data)) {
          for (const key of Object.keys(result.data[category])) {
            nuevos[`${category}.${key}`] = result.data[category][key];
          }
        }
        for (const clave of Object.keys(configCache)) delete configCache[clave];
        Object.assign(configCache, nuevos);
        globalThis.__lmrConfigCargada = true;
        window.dispatchEvent(new Event(CONFIG_UPDATED));
      }
    } catch {
    } finally {
      globalThis.__lmrConfigEnCurso = null;
    }
  })();
  return globalThis.__lmrConfigEnCurso;
}

export function valorDeConfig<T = string>(clave: string, porDefecto?: T): T | undefined {
  const definicion = definicionDe(clave);
  const categoria = definicion?.categoria ?? '';
  const guardado = configCache[`${categoria}.${clave}`];
  if (guardado !== undefined) return guardado as T;
  return definicion ? (definicion.default as T) : porDefecto;
}

/** Promesa de la descarga en curso o de la que falta: reutiliza la que ya esté en vuelo. */
export function cargarConfiguraciones(): Promise<void> {
  return ensureConfigs();
}

export function refrescarConfiguraciones(): Promise<void> {
  if (globalThis.__lmrConfigRefresco) return globalThis.__lmrConfigRefresco;
  globalThis.__lmrConfigRefresco = (async () => {
    await globalThis.__lmrConfigEnCurso;
    globalThis.__lmrConfigCargada = false;
    await ensureConfigs();
  })().finally(() => {
    globalThis.__lmrConfigRefresco = null;
  });
  return globalThis.__lmrConfigRefresco;
}

export function useConfigValue<T = string>(category: string, key: string, defaultValue: T): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const cacheKey = `${category}.${key}`;
    let activo = true;
    const actualizar = () => {
      if (activo) setValue((configCache[cacheKey] as T | undefined) ?? defaultValue);
    };
    window.addEventListener(CONFIG_UPDATED, actualizar);
    actualizar();
    void ensureConfigs().then(actualizar);
    return () => {
      activo = false;
      window.removeEventListener(CONFIG_UPDATED, actualizar);
    };
  }, [category, key, defaultValue]);

  return value;
}

export function useConfig<T = string>(clave: string, defaultValue?: T): T {
  const definicion = definicionDe(clave);
  return useConfigValue<T>(
    definicion?.categoria ?? '',
    clave,
    defaultValue ?? (definicion?.default as T | undefined) ?? (undefined as T)
  );
}
