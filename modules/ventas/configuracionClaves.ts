import type { DefinicionClave } from '@/lib/configuration/definitions';
import { porcentaje, enteroPositivo } from '@/lib/configuration/definitions';

/**
 * `{"<rol_id>": tope}` con el máximo de colaciones que cada trabajador del rol
 * puede recibir por turno de caja. Rol que falta en el mapa o clave vacía:
 * queda la regla vigente (1 por trabajador por turno). `0`: sin colación. Los
 * valores inválidos se ignoran al leer (ver
 * `modules/colaciones/topePorTurno.ts`); el validador es quien bloquea el
 * guardado: la clave tiene que guardar un JSON objeto y los topes enteros ≥ 0.
 */
const validarTopePorRol =
  (clave: string) =>
  (valor: string): string | null => {
    if (!valor.trim()) return null;
    let parseado: unknown;
    try {
      parseado = JSON.parse(valor);
    } catch {
      return `${clave} debe ser JSON válido, por ejemplo {"1": 10}`;
    }
    if (!parseado || typeof parseado !== 'object' || Array.isArray(parseado)) {
      return `${clave} debe ser un objeto rol → tope, por ejemplo {"1": 10}`;
    }
    for (const [rolId, tope] of Object.entries(parseado as Record<string, unknown>)) {
      if (typeof tope !== 'number' || !Number.isInteger(tope) || tope < 0) {
        return `${clave} debe tener un entero mayor o igual a 0 para el rol ${rolId}`;
      }
    }
    return null;
  };

export const CLAVES_VENTAS: Record<string, DefinicionClave> = {
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
  monto_base_trago_cortesia_cliente: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 10000,
    validar: enteroPositivo('monto_base_trago_cortesia_cliente')
  },
  costo_entrada: {
    categoria: 'comisiones',
    tipo: 'number',
    default: 10000,
    validar: enteroPositivo('costo_entrada')
  },
  colaciones_por_rol_y_turno: {
    categoria: 'comisiones',
    tipo: 'text',
    default: '',
    validar: validarTopePorRol('colaciones_por_rol_y_turno')
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
  }
};
