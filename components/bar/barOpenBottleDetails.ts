import { mlDeColacion } from '@/lib/business/colacionConfig';
import { resolveShotMl, resolveShotMlAnfitriona } from '@/lib/business/shotMl';
import {
  esBebidaAnalcoholica,
  parseSavedOptions,
  type BarStockItem
} from './transfer/transferOptions';

/** Una botella abierta en el bar y lo que todavía se puede servir de ella. */
export interface BarOpenBottleDetail {
  foto?: string | null;
  id: string;
  cantidad: number;
  ml_disponibles: number;
  producto_nombre: string;
  presentacion_nombre: string;
  /** Las analcohólicas muestran colación y corto por separado. */
  esBebidaAnalcoholica?: boolean;
  /** La presentación se vende por corto: solo los licores lo permiten. */
  venta_corto_habilitada: boolean;
  /** Analcohólica habilitada para entregar colaciones. */
  colacion_habilitada: boolean;
  /** Ml del corto de cliente (y de anfitriona en licores). */
  ml_cliente: number;
  ml_anfitriona: number;
  /** Cortos que salen de los ml disponibles. */
  shots_anfitriona_disponibles: number;
  shots_disponibles: number;
  /** Analcohólicas: ml de la colación y colaciones que salen de los ml. */
  ml_colacion: number;
  colaciones_disponibles: number;
}

/** Porciones que salen de los ml disponibles: los que no alcanzan no cuentan. */
function porciones(mlDisponibles: number, mlPorPorcion: number): number {
  return mlPorPorcion > 0 ? Math.floor(mlDisponibles / mlPorPorcion) : 0;
}

/**
 * Detalle de las botellas abiertas para el modal de ml disponibles del bar.
 *
 * Las licores se venden por corto, así que de sus ml disponibles salen cortos
 * de cliente y de anfitriona. Las analcohólicas pueden entregarse por colación
 * y, si su configuración lo permite, también por corto: ambas porciones se
 * calculan sobre los mismos ml. Los ml de la colación salen de la misma
 * configuración que usa el servidor para descontar el bar (`ml_colacion` de la
 * opción botella y, si no está, la capacidad de la botella).
 */
export function detalleBotellasAbiertas(
  items: BarStockItem[],
  shotMl: number
): BarOpenBottleDetail[] {
  return items
    .filter(item => (item.botellas_abiertas?.length ?? 0) > 0 || Number(item.ml_abierta) > 0)
    .map(item => {
      const esBebida = esBebidaAnalcoholica(item.categoria_nombre);
      const opciones = parseSavedOptions(item.opciones_venta) ?? [];
      const opcionBotella = opciones.find(option => option.tipo === 'botella');
      const mlColacion = esBebida ? mlDeColacion(opcionBotella, item.ml_botella) : 0;
      // Sin colación habilitada no hay porción que contar: la analcohólica se
      // vende de a botella y el bar solo muestra los ml que quedan.
      const colacionHabilitada =
        esBebida && opcionBotella?.colacion_habilitada === true && mlColacion > 0;
      // El corto es la misma cuenta en ambos tipos: el servidor descuenta
      // `ml_shot` por cada corto vendido, sea o no analcohólica la botella.
      const mlCliente = resolveShotMl(item.ml_shot, shotMl);
      const mlAnfitriona = resolveShotMlAnfitriona(item.ml_shot_anfitriona, mlCliente);
      const abiertas = item.botellas_abiertas ?? [];
      const disponibles = abiertas.length
        ? abiertas.reduce((total, botella) => total + Number(botella.ml_restante || 0), 0)
        : Number(item.ml_abierta || 0);
      return {
        id: item.id,
        producto_nombre: item.producto_nombre,
        foto: item.foto || item.producto_foto,
        presentacion_nombre: item.nombre,
        cantidad: abiertas.length || 1,
        ml_disponibles: disponibles,
        venta_corto_habilitada: opciones.some(option => option.tipo === 'shot'),
        colacion_habilitada: colacionHabilitada,
        ml_cliente: mlCliente,
        ml_anfitriona: mlAnfitriona,
        shots_anfitriona_disponibles: porciones(disponibles, mlAnfitriona),
        shots_disponibles: porciones(disponibles, mlCliente),
        ml_colacion: colacionHabilitada ? mlColacion : 0,
        colaciones_disponibles: porciones(disponibles, colacionHabilitada ? mlColacion : 0),
        esBebidaAnalcoholica: esBebida
      };
    });
}
