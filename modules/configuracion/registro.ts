/**
 * Registro de claves de configuración: la lista única de qué se puede guardar en la tabla
 * `configuraciones`, en qué categoría se agrupa, de qué tipo es, con qué valor se abre la
 * pantalla cuando no está guardada y qué valores acepta.
 *
 * De aquí se derivan las tres cosas que antes vivían sueltas y se desincronizaban:
 *
 * 1. **La validación del endpoint** (`app/api/configurations`): la lista de claves válidas
 *    y el mensaje de error de cada una. Un `if` por clave en la ruta era fácil de olvidar
 *    al agregar una clave nueva: entraba a la allowlist sin regla, o con regla pero sin
 *    categoría.
 * 2. **La categoría y el tipo con los que se inserta la fila**, que antes salían de
 *    ternarios anidados: `impuesto_iva`, `moneda`, `ambiente` y `timezone` se guardaban
 *    bajo `empresa` mientras el volcado base las deja en `facturacion` y `sistema`. Como
 *    el GET agrupa por la categoría de la fila, nadie encontraba lo que acababa de
 *    guardar: el IVA y la propina volvían a su default en cada pantalla y las claves de
 *    facturación se colaban en el estado del formulario de empresa.
 * 3. **Los defaults de los formularios**, que estaban repetidos literal por literal en
 *    cada componente (`750`, `50`, `3`, `'19'`…) y se desfasaban del servidor.
 *
 * Sin dependencias de servidor: lo importan componentes de cliente y la ruta de la API.
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

const enteroEnRango =
  (clave: string, min: number, max: number, sufijo = '') =>
  (valor: string) => {
    const num = Number(valor);
    if (isNaN(num) || !Number.isInteger(num) || num < min || num > max) {
      return `${clave} debe ser un número entero entre ${min} y ${max}${sufijo ? ` (${sufijo})` : ''}`;
    }
    return null;
  };

const porcentaje = (clave: string) => (valor: string) => {
  const num = Number(valor);
  if (isNaN(num) || num < 0 || num > 100) {
    return `${clave} debe estar entre 0 y 100`;
  }
  return null;
};

const enteroPositivo = (clave: string) => (valor: string) => {
  const num = Number(valor);
  if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
    return `${clave} debe ser un número entero positivo`;
  }
  return null;
};

const horaDelDia = (clave: string) => (valor: string) => {
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
const telefono =
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

const ADMIN_WHATSAPP = telefono('admin_whatsapp', '59172419112');
const TWILIO_WHATSAPP = telefono('twilio_whatsapp_number', 'whatsapp:+14155238886', true);

// ─── El registro ─────────────────────────────────────────────────────────────────

const texto = (default_ = ''): DefinicionClave => ({
  categoria: 'empresa',
  tipo: 'text',
  default: default_
});

export const REGISTRO_CLAVES: Record<string, DefinicionClave> = {
  // Empresa
  empresa_nombre: texto('Las Muñecas de Ramón'),
  empresa_rut: texto(),
  empresa_direccion: texto(),
  empresa_telefono: texto(),
  empresa_email: texto(),
  empresa_facebook: texto(),
  empresa_instagram: texto(),
  empresa_whatsapp: texto(),
  empresa_tiktok: texto(),

  // Facturación: estas tres están bajo `facturacion` en el volcado base. Antes el PUT las
  // guardaba bajo `empresa` y el GET las devolvía donde nadie las leía.
  impuesto_iva: {
    categoria: 'facturacion',
    tipo: 'number',
    default: 19,
    validar: porcentaje('impuesto_iva')
  },
  propina_venta: {
    categoria: 'facturacion',
    tipo: 'number',
    default: 10,
    validar: porcentaje('propina_venta')
  },
  moneda: { categoria: 'facturacion', tipo: 'text', default: 'CLP' },
  // Ya no hay campo que las edite (ver la fila del 03-10 en PLAN.md): se conservan para no
  // perder lo guardado, pero ningún formulario las reenvía.
  facturacion_activada: { categoria: 'facturacion', tipo: 'boolean', default: false },
  resolucion_sii: { categoria: 'facturacion', tipo: 'text', default: '' },

  // Sistema
  ambiente: { categoria: 'sistema', tipo: 'text', default: 'produccion' },
  timezone: { categoria: 'sistema', tipo: 'text', default: 'America/Santiago' },
  admin_whatsapp: {
    categoria: 'sistema',
    tipo: 'text',
    default: '',
    validar: ADMIN_WHATSAPP
  },

  // Asistencia
  asistencia_hora_inicio: {
    categoria: 'asistencia',
    tipo: 'number',
    default: 0,
    validar: horaDelDia('asistencia_hora_inicio')
  },
  asistencia_hora_fin: {
    categoria: 'asistencia',
    tipo: 'number',
    default: 23,
    validar: horaDelDia('asistencia_hora_fin')
  },

  // Comisiones y pagos
  // `threshold_producto_caro` está deprecado: alias de `umbral_habitacion_desde`. El
  // registro declara el vínculo en ambos sentidos, así que guardar una sincroniza la otra
  // sin ternarios en la ruta.
  threshold_producto_caro: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 10000,
    alias: 'umbral_habitacion_desde',
    validar: enteroPositivo('threshold_producto_caro')
  },
  umbral_simple_hasta: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 10000,
    validar: enteroPositivo('umbral_simple_hasta')
  },
  umbral_anfitriona_desde: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 20000,
    validar: enteroPositivo('umbral_anfitriona_desde')
  },
  umbral_habitacion_desde: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 30000,
    alias: 'threshold_producto_caro',
    validar: enteroPositivo('umbral_habitacion_desde')
  },
  split_tarjeta_venta: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 51,
    validar: enteroPositivo('split_tarjeta_venta')
  },
  split_tarjeta_propina: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 49,
    validar: enteroPositivo('split_tarjeta_propina')
  },

  // Bar
  shot_ml: {
    categoria: 'bar',
    tipo: 'number',
    default: 50,
    validar: enteroEnRango('shot_ml', 1, 1000, 'ml por shot')
  },
  botella_ml: {
    categoria: 'bar',
    tipo: 'number',
    default: 750,
    validar: enteroEnRango('botella_ml', 1, 10000, 'ml por botella')
  },
  shots_alerta: {
    categoria: 'bar',
    tipo: 'number',
    default: 3,
    validar: enteroEnRango('shots_alerta', 1, 50, 'shots restantes')
  },

  // Integraciones
  twilio_account_sid: {
    categoria: 'integraciones',
    tipo: 'text',
    default: '',
    validar: (valor: string) => {
      if (!valor) return null; // Vacío = seguir usando la variable de entorno.
      if (!/^AC[0-9a-f]{32}$/i.test(valor.trim())) {
        return 'twilio_account_sid debe ser un Account SID de Twilio (empieza con AC y tiene 32 caracteres)';
      }
      return null;
    }
  },
  twilio_auth_token: {
    categoria: 'integraciones',
    tipo: 'text',
    default: '',
    validar: (valor: string) => {
      if (!valor) return null;
      if (!/^[A-Za-z0-9_\-]{16,128}$/.test(valor.trim())) {
        return 'twilio_auth_token debe ser un Auth Token válido de Twilio (mínimo 16 caracteres)';
      }
      return null;
    }
  },
  twilio_whatsapp_number: {
    categoria: 'integraciones',
    tipo: 'text',
    default: '',
    validar: TWILIO_WHATSAPP
  }
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
