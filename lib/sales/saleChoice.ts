// Qué formas de venta ofrece una presentación del bar y qué precio y comisión lleva cada
// una. Lo comparten el modal de productos (venta por categoría) y el buscador rápido: antes
// cada uno resolvía la regla por su cuenta, y el buscador se quedaba solo con la botella.
import type { SaleOption, SaleType } from '@/types/sale-options';
import { parseSavedOptions } from '@/components/bar/transfer/transferOptions';

/** Forma de venta elegida: botella entera o shot, a precio de cliente o de anfitriona. */
export type SaleChoice = SaleType | 'shot_anfitriona';

export interface OpcionVentaProducto {
  value: SaleChoice;
  /** Nombre sin precio: 'Botella', 'Shot' (o 'Shot cliente') y 'Shot anfitriona'. */
  nombre: string;
  precio: number;
  comision: number;
  esShot: boolean;
}

export interface VentaProductoResuelta {
  opciones: OpcionVentaProducto[];
  /** La presentación tiene precio de shot: se puede vender por ml. */
  tieneShot: boolean;
  /** Hay precio de anfitriona: quien vende elige a quién le cobra el shot. */
  tieneShotAnfitriona: boolean;
  /** Elección normalizada contra lo que el producto realmente ofrece. */
  tipoVenta: SaleChoice;
  esShot: boolean;
  precio: number;
  comision: number;
  /** Precio y comisión de la botella entera (la regla de anfitriona mira este precio). */
  precioBotella: number;
  comisionBotella: number;
  /** Tope de unidades: el shot sale de la botella abierta, así que no gasta botellas. */
  maxCantidad: number;
}

/**
 * Resuelve las opciones de venta de una presentación. `eleccion` es lo que eligió quien
 * vende; si el producto no ofrece esa forma (sin precio de anfitriona, sin shot), cae a la
 * más parecida en vez de romper.
 */
export function resolverVentaProducto(producto: any, eleccion?: SaleChoice): VentaProductoResuelta {
  // `opciones_venta` puede venir como array o como el JSON que guarda
  // Configuraciones; sin parsear, el selector desaparecería del todo.
  const opcionesVenta: SaleOption[] = parseSavedOptions(producto?.opciones_venta) ?? [];
  const opcionShot = opcionesVenta.find(opcion => opcion.tipo === 'shot');
  const opcionBotella = opcionesVenta.find(opcion => opcion.tipo === 'botella');

  const precioBotella = Number(opcionBotella?.precio ?? producto?.precio ?? producto?.price ?? 0);
  const comisionBotella = Number(
    opcionBotella?.comision ?? producto?.comision ?? producto?.commission ?? 0
  );
  const precioShotCliente = Number(opcionShot?.precio ?? 0);
  const comisionShot = Number(opcionShot?.comision ?? 0);
  const precioAnfitriona = Number(opcionShot?.precio_anfitriona ?? 0);
  const tieneShot = Boolean(opcionShot && precioShotCliente > 0);
  const tieneShotAnfitriona = tieneShot && precioAnfitriona > 0;

  const opciones: OpcionVentaProducto[] = [
    {
      value: 'botella',
      nombre: 'Botella',
      precio: precioBotella,
      comision: comisionBotella,
      esShot: false
    },
    ...(tieneShot
      ? [
          {
            value: 'shot' as SaleChoice,
            nombre: tieneShotAnfitriona ? 'Shot cliente' : 'Shot',
            precio: precioShotCliente,
            comision: comisionShot,
            esShot: true
          }
        ]
      : []),
    ...(tieneShotAnfitriona
      ? [
          {
            value: 'shot_anfitriona' as SaleChoice,
            nombre: 'Shot anfitriona',
            precio: precioAnfitriona,
            comision: comisionShot,
            esShot: true
          }
        ]
      : [])
  ];

  const tipoVenta: SaleChoice =
    eleccion === 'shot_anfitriona' && tieneShotAnfitriona
      ? 'shot_anfitriona'
      : (eleccion === 'shot' || eleccion === 'shot_anfitriona') && tieneShot
        ? 'shot'
        : 'botella';

  const elegida = opciones.find(opcion => opcion.value === tipoVenta) ?? opciones[0];
  const maxCantidad = elegida.esShot ? 99 : Number(producto?.stock_bar ?? 0);

  return {
    opciones,
    tieneShot,
    tieneShotAnfitriona,
    tipoVenta,
    esShot: elegida.esShot,
    precio: elegida.precio,
    comision: elegida.comision,
    precioBotella,
    comisionBotella,
    maxCantidad
  };
}
