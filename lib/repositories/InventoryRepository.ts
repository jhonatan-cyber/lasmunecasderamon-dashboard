/**
 * Inventario: presentaciones, barra, transferencias, devoluciones de envases y unidades.
 *
 * Este archivo es **sólo la fachada**: cada dominio vive en `inventory/` siguiendo el mismo
 * patrón que `sale/`, `event/`, `cuenta/` y `stats/` (`<Dominio>Queries` con el SQL, y
 * un repositorio que delega y conserva la ruta de import pública). Todo el código de
 * inventario ocupaba un solo archivo de más de mil setecientas líneas, en el que una
 * modificación del bar obligaba a leer los escaneos de envases y la generación de EAN.
 *
 * Lo que este archivo expone no cambia: los servicios, las rutas y los tests siguen
 * importando de acá.
 */
import { BarQueries } from './inventory/BarQueries';
import { CatalogoQueries } from './inventory/CatalogoQueries';
import { EnvaseQueries } from './inventory/EnvaseQueries';
import { MovimientoQueries } from './inventory/MovimientoQueries';
import { PresentacionQueries } from './inventory/PresentacionQueries';
import { TransferQueries } from './inventory/TransferQueries';
import { UnidadQueries } from './inventory/UnidadQueries';
import { query } from '@/lib/database/db';
import {
  completarOpciones,
  ean13CheckDigit,
  esEstadoUnidadValido,
  generarEan13Interno,
  parseOpcionesVenta,
  resolverBotella
} from './inventory/inventoryHelpers';
import {
  DEFAULT_BOTTLE_ML,
  DEFAULT_SHOTS_ALERTA,
  DEFAULT_SHOT_ML,
  getBarMlConfig,
  getTopeSimple
} from './inventory/inventoryConfig';
import {
  ESTADO_UNIDAD_ACTIVA,
  ESTADO_UNIDAD_INACTIVA,
  ESTADO_UNIDAD_VENDIDA
} from './inventory/inventoryHelpers';
import type {
  DevolucionEnvaseMotivo,
  DevolucionEnvaseRegistro,
  DevolucionEnvaseResultado,
  DevolucionEnvaseUnidad,
  NivelPrecio,
  PresentacionRow,
  Queryable,
  ShotAlert,
  ShotsSummary,
  TraspasoInput,
  UnidadRow
} from './inventory/inventoryTypes';

export type {
  DevolucionEnvaseMotivo,
  DevolucionEnvaseRegistro,
  DevolucionEnvaseResultado,
  DevolucionEnvaseUnidad,
  NivelPrecio,
  PresentacionRow,
  ShotAlert,
  ShotsSummary,
  TraspasoInput,
  UnidadRow
};
// La fachada reexporta todo lo que el archivo de una sola pieza exportaba, incluidos los
// helpers que hoy nadie importa: dejarlos acá evita que partir el archivo se convierta sin
// querer en un cambio de API.
export {
  completarOpciones,
  ean13CheckDigit,
  esEstadoUnidadValido,
  generarEan13Interno,
  parseOpcionesVenta,
  resolverBotella
};
export { DEFAULT_BOTTLE_ML, DEFAULT_SHOTS_ALERTA, DEFAULT_SHOT_ML, getBarMlConfig, getTopeSimple };
export { ESTADO_UNIDAD_ACTIVA, ESTADO_UNIDAD_INACTIVA, ESTADO_UNIDAD_VENDIDA };

export class InventoryRepository {
  static async listPresentationsByProducts(
    productoIds: string[],
    trx: Queryable = query
  ): Promise<Record<string, PresentacionRow[]>> {
    return await PresentacionQueries.listPresentationsByProducts(productoIds, trx);
  }

  static async listPresentations(
    productoId: string,
    trx: Queryable = query
  ): Promise<PresentacionRow[]> {
    return await PresentacionQueries.listPresentations(productoId, trx);
  }

  static async createPresentation(
    trx: Queryable,
    data: {
      producto_id: string;
      nombre: string;
      codigo_barras?: string | null;
      precio_compra?: number;
      foto?: string | null;
    }
  ): Promise<PresentacionRow> {
    return await PresentacionQueries.createPresentation(trx, data);
  }

  static async deletePresentation(id: string): Promise<void> {
    return await PresentacionQueries.deletePresentation(id);
  }

  static async getPresentationById(id: string): Promise<PresentacionRow | null> {
    return await PresentacionQueries.getPresentationById(id);
  }

  static async updatePresentationFoto(id: string, foto: string): Promise<void> {
    return await PresentacionQueries.updatePresentationFoto(id, foto);
  }

  static async updatePresentation(
    id: string,
    fields: {
      nombre?: string;
      codigo_barras?: string | null;
      precio_compra?: number;
      precio_venta?: number;
      comision?: number;
      ml_botella?: number | null;
    }
  ): Promise<void> {
    return await PresentacionQueries.updatePresentation(id, fields);
  }

  static async traspasarAlBar(
    trx: Queryable,
    input: TraspasoInput
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    return await BarQueries.traspasarAlBar(trx, input);
  }

  static async traspasarAlBarStandalone(
    input: TraspasoInput
  ): Promise<{ trasladadas: number; stock_bar: number }> {
    return await BarQueries.traspasarAlBarStandalone(input);
  }

  static async consume(
    trx: Queryable,
    detalles: {
      presentacion_id?: string | null;
      cantidad?: number | null;
      tipo_venta?: string | null;
      shot_anfitriona?: boolean | null;
    }[],
    contexto: { usuarioId: string | null; fecha: string }
  ): Promise<ShotAlert[]> {
    return await BarQueries.consume(trx, detalles, contexto);
  }

  static async acceptTransfer(trx: Queryable, id: string, usuarioId: string): Promise<void> {
    return await TransferQueries.acceptTransfer(trx, id, usuarioId);
  }

  static async acceptTransferStandalone(id: string, usuarioId: string): Promise<void> {
    return await TransferQueries.acceptTransferStandalone(id, usuarioId);
  }

  static async rejectTransfer(trx: Queryable, id: string, usuarioId: string): Promise<void> {
    return await TransferQueries.rejectTransfer(trx, id, usuarioId);
  }

  static async rejectTransferStandalone(id: string, usuarioId: string): Promise<void> {
    return await TransferQueries.rejectTransferStandalone(id, usuarioId);
  }

  static async getMaxAnfitrionasMap(productoIds: string[]): Promise<Record<string, number | null>> {
    return await BarQueries.getMaxAnfitrionasMap(productoIds);
  }

  static async listBarStock(productoId?: string): Promise<
    (PresentacionRow & {
      producto_nombre: string;
      producto_codigo: string;
      producto_foto: string | null;
      categoria_nombre: string | null;
    })[]
  > {
    return await BarQueries.listBarStock(productoId);
  }

  static async getShotsSummary(): Promise<ShotsSummary> {
    return await BarQueries.getShotsSummary();
  }

  static async listForSale(filters?: { category_id?: string; term?: string }): Promise<any[]> {
    return await CatalogoQueries.listForSale(filters);
  }

  static async listMovimientos(presentacionId: string, limit = 20): Promise<any[]> {
    return await MovimientoQueries.listMovimientos(presentacionId, limit);
  }

  static async listMovimientosRecientes(limit = 100): Promise<any[]> {
    return await MovimientoQueries.listMovimientosRecientes(limit);
  }

  static async createPresentationStandalone(data: {
    producto_id: string;
    nombre: string;
    codigo_barras?: string | null;
    precio_compra?: number;
    foto?: string | null;
  }): Promise<PresentacionRow> {
    return await PresentacionQueries.createPresentationStandalone(data);
  }

  static async listTransfers(pendingOnly = false) {
    return await TransferQueries.listTransfers(pendingOnly);
  }

  static async findByBarcode(
    codigoBarras: string,
    trx: Queryable = query
  ): Promise<PresentacionRow | null> {
    return await PresentacionQueries.findByBarcode(codigoBarras, trx);
  }

  static async findByUnitBarcode(
    codigoBarras: string,
    trx: Queryable = query
  ): Promise<UnidadRow | null> {
    return await PresentacionQueries.findByUnitBarcode(codigoBarras, trx);
  }

  static async verifyAndReturnContainer(
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await EnvaseQueries.verifyAndReturnContainer(codigoEscaneado, usuarioId);
  }

  static async verificarYMarcarEnvase(
    trx: Queryable,
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await EnvaseQueries.verificarYMarcarEnvase(trx, codigoEscaneado, usuarioId);
  }

  static async confirmContainerReturn(
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await EnvaseQueries.confirmContainerReturn(codigoEscaneado, usuarioId);
  }

  static async confirmarRecepcionEnvase(
    trx: Queryable,
    codigoEscaneado: unknown,
    usuarioId: string | null
  ): Promise<DevolucionEnvaseResultado> {
    return await EnvaseQueries.confirmarRecepcionEnvase(trx, codigoEscaneado, usuarioId);
  }

  static async listContainerReturns(
    limite: number = 100,
    trx: Queryable = query
  ): Promise<DevolucionEnvaseRegistro[]> {
    return await EnvaseQueries.listContainerReturns(limite, trx);
  }

  static async countUnits(
    productoId: string,
    trx: Queryable = query,
    ubicacion: string = 'almacen'
  ): Promise<number> {
    return await UnidadQueries.countUnits(productoId, trx, ubicacion);
  }

  static async setUnitsEstado(trx: Queryable, unidadIds: string[], estado: string): Promise<void> {
    return await UnidadQueries.setUnitsEstado(trx, unidadIds, estado);
  }

  static async setUnitsEstadoStandalone(
    productoId: string,
    unidadIds: string[],
    estado: string
  ): Promise<number> {
    return await UnidadQueries.setUnitsEstadoStandalone(productoId, unidadIds, estado);
  }

  static async listUnits(
    productoId: string,
    limit = 1000,
    ubicacion?: string,
    presentacionId?: string
  ): Promise<{ total: number; inactivas: number; unidades: UnidadRow[] }> {
    return await UnidadQueries.listUnits(productoId, limit, ubicacion, presentacionId);
  }

  static async markUnitsPrinted(ids: string[]) {
    return await UnidadQueries.markUnitsPrinted(ids);
  }

  static async generateUnits(
    trx: Queryable,
    productoId: string,
    count: number,
    presentacionId?: string | null,
    compraId?: string | null
  ): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
    return await UnidadQueries.generateUnits(trx, productoId, count, presentacionId, compraId);
  }

  static async syncStockTotal(trx: Queryable, productoId: string): Promise<number> {
    return await UnidadQueries.syncStockTotal(trx, productoId);
  }

  static async generateUnitsStandalone(
    productoId: string,
    count: number,
    presentacionId?: string | null
  ): Promise<{ id: string; codigo: string; codigo_barras: string }[]> {
    return await UnidadQueries.generateUnitsStandalone(productoId, count, presentacionId);
  }
}
