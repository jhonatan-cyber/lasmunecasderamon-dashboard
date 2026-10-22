/**
 * Tipos y validadores puros compartidos para configuración.
 * Cada módulo declara sus claves; modules/configuracion/registro compone
 * las categorías, reglas, alias y defaults usados por HTTP y formularios.
 */

export type CategoriaConfig =
  'empresa' | 'facturacion' | 'sistema' | 'asistencia' | 'comisiones' | 'bar' | 'integraciones';

export type TipoConfig = 'number' | 'boolean' | 'text';

export interface DefinicionClave {
  /** Carpeta en la que aparece en la respuesta del GET. */
  categoria: CategoriaConfig;
  tipo: TipoConfig;
  /**
   * Valor con el que se abre la pantalla cuando la clave no está guardada. Es el valor
   * que el código usaba antes de este registro, para que adoptarlo no cambie lo que ve
   * nadie: una instalación nueva ya trae su propia fila en el volcado base.
   */
  default: string | number | boolean;
  /** Alias deprecado: guardar una escribe también la otra con el mismo valor. */
  alias?: string;
  /** Mensaje de error si el valor no sirve, o `null` si sirve. */
  validar?: (valor: string) => string | null;
}

// ─── Validadores reutilizables ───────────────────────────────────────────────────

export const enteroEnRango =
  (clave: string, min: number, max: number, sufijo = '') =>
  (valor: string) => {
    const num = Number(valor);
    if (isNaN(num) || !Number.isInteger(num) || num < min || num > max) {
      return `${clave} debe ser un número entero entre ${min} y ${max}${sufijo ? ` (${sufijo})` : ''}`;
    }
    return null;
  };

export const porcentaje = (clave: string) => (valor: string) => {
  const num = Number(valor);
  if (isNaN(num) || num < 0 || num > 100) {
    return `${clave} debe estar entre 0 y 100`;
  }
  return null;
};

export const enteroPositivo = (clave: string) => (valor: string) => {
  const num = Number(valor);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return `${clave} debe ser un número entero positivo`;
  }
  return null;
};

export const horaDelDia = (clave: string) => (valor: string) => {
  const num = Number(valor);
  if (isNaN(num) || num < 0 || num > 23 || !Number.isInteger(num)) {
    return `${clave} debe ser una hora válida entre 0 y 23`;
  }
  return null;
};

/**
 * Teléfono con prefijo opcional de WhatsApp. `recortar` reproduce la diferencia que
 * había entre `admin_whatsapp` y el número de Twilio: sólo el segundo recorta antes de
 * comparar.
 */
export const telefono =
  (clave: string, ejemplo: string, recortar = false) =>
  (valor: string) => {
    const normalizado = recortar
      ? valor.replace('whatsapp:', '').trim()
      : valor.replace('whatsapp:', '');
    if (valor && !/^\+?\d{7,15}$/.test(normalizado)) {
      return `${clave} debe ser un número válido (ej: ${ejemplo})`;
    }
    return null;
  };

// ─── El registro ─────────────────────────────────────────────────────────────────

export const texto = (default_ = ''): DefinicionClave => ({
  categoria: 'empresa',
  tipo: 'text',
  default: default_
});
