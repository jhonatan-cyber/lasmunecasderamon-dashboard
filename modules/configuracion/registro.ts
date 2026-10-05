export type {
  CategoriaConfig,
  DefinicionClave,
  TipoConfig
} from '@/lib/configuracion/definiciones';
import type { DefinicionClave, CategoriaConfig } from '@/lib/configuracion/definiciones';
import { texto } from '@/lib/configuracion/definiciones';
import { CLAVES_ASISTENCIA } from '@/modules/asistencia/contracts';
import { CLAVES_INVENTARIO } from '@/modules/inventario/contracts';
import { CLAVES_VENTAS } from '@/modules/ventas/contracts';
import { CLAVES_COMUNICACIONES } from '@/modules/comunicaciones/contracts';

/** Agrega reglas de los propietarios sin acceso a infraestructura. */
export const REGISTRO_CLAVES: Record<string, DefinicionClave> = {
  empresa_nombre: texto('Las Muñecas de Ramón'),
  empresa_rut: texto(),
  empresa_direccion: texto(),
  empresa_telefono: texto(),
  empresa_email: texto(),
  empresa_facebook: texto(),
  empresa_instagram: texto(),
  empresa_whatsapp: texto(),
  empresa_tiktok: texto(),
  moneda: { categoria: 'facturacion', tipo: 'text', default: 'CLP' },
  facturacion_activada: { categoria: 'facturacion', tipo: 'boolean', default: false },
  resolucion_sii: { categoria: 'facturacion', tipo: 'text', default: '' },
  ambiente: { categoria: 'sistema', tipo: 'text', default: 'produccion' },
  timezone: { categoria: 'sistema', tipo: 'text', default: 'America/Santiago' },
  ...CLAVES_ASISTENCIA,
  ...CLAVES_INVENTARIO,
  ...CLAVES_VENTAS,
  ...CLAVES_COMUNICACIONES
};

/** Claves que limpian su caché en memoria al guardarse. */
export const CLAVES_CON_CACHE = new Set<string>(['admin_whatsapp']);

// ─── Derivados ───────────────────────────────────────────────────────────────────

/** Todas las claves guardables: la allowlist del endpoint sale de acá. */
export const CLAVES_CONFIG = Object.keys(REGISTRO_CLAVES);

export function definicionDe(clave: string): DefinicionClave | undefined {
  return Object.prototype.hasOwnProperty.call(REGISTRO_CLAVES, clave)
    ? REGISTRO_CLAVES[clave]
    : undefined;
}

export function esClaveConfigValida(clave: string): boolean {
  return definicionDe(clave) !== undefined;
}

/** Mensaje de error de una clave, o `null` si el valor sirve. */
export function validarConfig(clave: string, valor: string): string | null {
  const definicion = definicionDe(clave);
  if (!definicion) return `Clave desconocida: ${clave}`;
  return definicion.validar?.(valor) ?? null;
}

/** Default de una clave, o `undefined` si no está en el registro. */
export function defaultDeClave<T extends string | number | boolean>(clave: string): T | undefined {
  return definicionDe(clave)?.default as T | undefined;
}

/** Categoría en la que el GET agrupa una clave. */
export function categoriaDeClave(clave: string): CategoriaConfig | undefined {
  return definicionDe(clave)?.categoria;
}

/** Alias deprecado de una clave, si tiene. */
export function aliasDeClave(clave: string): string | undefined {
  return definicionDe(clave)?.alias;
}
