'use client';

import { useState, useEffect } from 'react';
import { definicionDe } from '@/modules/configuracion/contracts';

/**
 * Estado compartido en `globalThis` y no en el módulo.
 *
 * En desarrollo el bundler mete el mismo módulo en varios chunks, así que hay varias
 * instancias de estas variables a la vez: con la caché en el ámbito del módulo, tres
 * copias arrancaban tres descargas a la vez (medido: 3 peticiones simultáneas a
 * `/api/configurations` en el dashboard, las tres saliendo a los ~1040 ms). Es el mismo
 * truco que usa el pool de PostgreSQL en `lib/database/db.ts`.
 */
declare global {
  var __lmrConfigCache: Record<string, string | number | boolean> | undefined;
  var __lmrConfigEnCurso: Promise<void> | null | undefined;
  var __lmrConfigCargada: boolean | undefined;
  var __lmrConfigRefresco: Promise<void> | null | undefined;
}

const configCache: Record<string, string | number | boolean> = (globalThis.__lmrConfigCache ??= {});
const CONFIG_UPDATED = 'lmr:config-updated';
/**
 * Devuelve la promesa de la descarga en curso, o lanza una si no hay ninguna.
 *
 * La segunda línea es la que arregla el defecto: antes sólo se comprobaba `cacheLoaded`, que
 * pasa a `true` *cuando la respuesta llega*, así que todos los componentes que llamaban al
 * hook en el mismo render veían la caché vacía y cada uno lanzaba su propio `fetch`. En el
 * dashboard eran **12 peticiones idénticas** a `/api/configurations` por carga (medido con
 * la cabecera `x-lmr-consultas`), 18 de las 38 peticiones de la pantalla. Compartir la
 * promesa en vuelo las deja en una.
 */
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
      // keep defaults
    } finally {
      // Se libera siempre: si falló, el siguiente consumidor puede reintentar.
      globalThis.__lmrConfigEnCurso = null;
    }
  })();
  return globalThis.__lmrConfigEnCurso;
}

/**
 * Valor de una clave leído de la caché, sin promesa y sin red: lo guardado si llegó la
 * respuesta, si no el default del registro, y `porDefecto` si la clave ni siquiera está en
 * el registro. Para los lectores que no pueden usar un hook (`IvaRateProvider`, que vive en
 * el layout raíz y por eso era la segunda descarga de cada pantalla).
 */
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

/**
 * Reemplaza la caché con una respuesta nueva de `/api/configurations` y actualiza lectores.
 *
 * Sin esto, guardar desde Configuraciones dejaba a las demás pantallas con el valor viejo
 * hasta que se recargara la página: la caché es de vida de la pestaña. Se llama después de
 * un guardado correcto, desde los tabs que editan claves.
 */
export function refrescarConfiguraciones(): Promise<void> {
  if (globalThis.__lmrConfigRefresco) return globalThis.__lmrConfigRefresco;
  globalThis.__lmrConfigRefresco = (async () => {
    // Espera la lectura anterior para impedir que sobrescriba los valores recién guardados.
    await globalThis.__lmrConfigEnCurso;
    globalThis.__lmrConfigCargada = false;
    // Conserva los últimos valores válidos si la red falla durante el refresco.
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

/**
 * Valor de una clave de configuración con la categoría y el default del registro de
 * `lib/configuraciones/registroClaves.ts`:
 *
 * ```ts
 * useConfigValue<number>('bar', 'botella_ml', 750)  // repetía categoría y default
 * useConfig<number>('botella_ml')                   // sale del registro
 * ```
 *
 * Pensada para lecturas sin botón de guardar: el valor puede cambiar de golpe cuando llega
 * la respuesta de `/api/configurations`. En un formulario con guardado hay que esperar a
 * tener el valor guardado antes de habilitar el botón (allí se lee la API a mano, como hace
 * SettingsBarTab), porque si no se puede guardar el default sobre lo que estaba en la base.
 *
 * Una clave fuera del registro no tiene categoría ni default: devuelve `defaultValue`
 * (o `undefined`), que es el mismo comportamiento que antes de existir el registro.
 */
export function useConfig<T = string>(clave: string, defaultValue?: T): T {
  const definicion = definicionDe(clave);
  return useConfigValue<T>(
    definicion?.categoria ?? '',
    clave,
    defaultValue ?? (definicion?.default as T | undefined) ?? (undefined as T)
  );
}
