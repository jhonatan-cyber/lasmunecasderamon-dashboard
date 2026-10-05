/**
 * Contratos del módulo de Configuración — §5: «DTO y esquemas aptos para
 * consumidores».
 *
 * El módulo es dueño de `configuraciones` y `backups`. `registro.ts` agrega las
 * reglas de cada propietario mediante contratos puros: asistencia, inventario,
 * ventas y comunicaciones mantienen categoría, validación, default y alias.
 *
 * Como el registro es puro dato sin dependencias de servidor, la UI también lo
 * necesita —para no abrir un formulario con un default distinto al que valida el
 * endpoint— y §5 sólo le permite importar `contracts.ts`. Por eso este archivo
 * reexporta las piezas públicas del registro.
 */
export {
  CLAVES_CONFIG,
  CLAVES_CON_CACHE,
  REGISTRO_CLAVES,
  aliasDeClave,
  categoriaDeClave,
  defaultDeClave,
  definicionDe,
  esClaveConfigValida,
  validarConfig
} from './registro';
export type { CategoriaConfig, DefinicionClave as ClaveRegistrada, TipoConfig } from './registro';

/** Fila de `configuraciones` tal como la lee el listado. */
export interface FilaConfiguracion {
  id: number;
  clave: string;
  valor: string;
  descripcion: string;
  categoria: string;
  tipo: string;
}

/** Configuración agrupada por categoría, que es lo que devuelve el listado. */
export type ConfiguracionesPorCategoria = Record<string, Record<string, string | number | boolean>>;

/** Respaldo del listado, sin el `json_data`, que pesa. */
export interface Respaldo {
  id_backup: string;
  nombre: string;
  descripcion: string | null;
  tablas_incluidas: string[];
  registros_count: number;
  tamano_bytes: number;
  fecha_crea: string;
  estado: number;
  [campo: string]: unknown;
}

/** Datos que hay que guardar para restaurar o descargar un respaldo. */
export interface RespaldoConDatos extends Respaldo {
  json_data: string | null;
}

/** Resumen que devuelve la creación de un respaldo. */
export interface RespaldoCreado {
  id: string;
  nombre: string;
  descripcion?: string;
  tablas_incluidas: number;
  registros_count: number;
  tamano_bytes: number;
  fecha_crea: string;
}
