/**
 * Casos de uso de claves de configuración — aplicación del módulo Configuración.
 *
 * No toca SQL ni el driver: eso vive en `./repositorio`, que es privado del módulo.
 * La regla de cada clave (categoría, tipo, validación y alias deprecados) sí vive
 * aquí, en `./registro`, que la fase 6 reubica desde `lib/configuraciones`.
 */
import {
  categoriaDeClave,
  definicionDe,
  validarConfig as validarClaveDeRegistro
} from '../registro';
import type { ConfiguracionesPorCategoria } from '../contracts';
import * as repositorio from './repositorio';

/** Lo que el GET devuelve en vez del Auth Token real: es un secreto. */
const AUTH_TOKEN_MASK = '••••••••••••';

/**
 * Todas las claves, agrupadas por categoría y con el tipo ya convertido.
 *
 * La categoría es la de la clave (registro) y no la de la fila: una clave guardada
 * antes de que existiera el registro aparece igual donde la buscan las pantallas.
 * Las claves fuera del registro conservan la categoría que tengan guardada.
 */
export async function listarConfiguracionesAgrupadas(): Promise<ConfiguracionesPorCategoria> {
  const configs = await repositorio.listarConfiguraciones();
  const grouped: ConfiguracionesPorCategoria = {};

  for (const config of configs) {
    const categoria = categoriaDeClave(config.clave) ?? config.categoria;
    if (!grouped[categoria]) {
      grouped[categoria] = {};
    }

    let value: string | number | boolean = config.valor;
    if (config.tipo === 'number') {
      const numericValue = Number(config.valor);
      value = Number.isFinite(numericValue) ? numericValue : 0;
    } else if (config.tipo === 'boolean') {
      value = config.valor === 'true' || config.valor === '1' || config.valor === 'yes';
    }

    // El Auth Token nunca sale en claro: se devuelve enmascarado y el PUT lo
    // ignora si llega igual (o vacío), así guardar no lo pisa.
    if (config.clave === 'twilio_auth_token' && typeof value === 'string' && value) {
      value = AUTH_TOKEN_MASK;
    }

    grouped[categoria][config.clave] = value;
  }

  return grouped;
}

/** Valor de una clave, o `null` si no existe. */
export async function obtenerValorConfiguracion(clave: string): Promise<string | null> {
  return repositorio.obtenerValorConfiguracion(clave);
}

/**
 * Guarda una clave ya validada por el registro. Devuelve el mensaje de error si el
 * valor no cumple la regla, para que la ruta lo muestre tal cual.
 */
export async function guardarClave(clave: string, valor: string): Promise<string | null> {
  const error = validarClaveDeRegistro(clave, valor);
  if (error) return error;

  await repositorio.guardarConfiguracion(clave, valor, definicionDe(clave) ?? null);
  return null;
}
