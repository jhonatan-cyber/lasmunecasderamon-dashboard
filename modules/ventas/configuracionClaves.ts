import type { DefinicionClave } from '@/lib/configuracion/definiciones';
import { porcentaje, enteroPositivo } from '@/lib/configuracion/definiciones';
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
