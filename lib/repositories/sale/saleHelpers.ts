import { z } from 'zod';
import type { SaleType } from '@/lib/business/schemas';
import { SaleSchema } from '@/lib/business/schemas';
import type { VentaRawRow, VentaGetByIdRow } from '../types';
import { logger } from '@/lib/utils/logger';

export type MixedPayment = {
  metodo: string;
  monto: number;
};

export type AllocationRow<T> = T & {
  currentAmount: number;
  nextAmount?: number;
};

export type VentaRefundDetailRow = {
  id_detalle_venta: string;
  producto_id: string | null;
  cantidad: number;
  precio: number;
  sub_total: number;
  comision: number;
};

export type VentaGetByIdResponse = SaleType & {
  cajero_nick?: string | null;
  cajero_nombre?: string | null;
  cajero_apellido?: string | null;
  garzon_nombre?: string | null;
  habitacion_nombre?: string | null;
  total_comision: number;
  comisiones_detalle: { nick: string; foto: string | null; monto: number }[];
  propinas_detalle: {
    usuario_id: string | null;
    nick: string | null;
    nombre: string | null;
    apellido: string | null;
    foto: string | null;
    monto: number;
  }[];
  detalles: {
    id: string;
    venta_id: string;
    producto_id: string | null;
    precio: number;
    comision: number;
    cantidad: number;
    sub_total: number;
    producto_nombre: string | null;
    producto_precio: number | undefined;
  }[];
  usuarios: { id: string; usuario_id: string; nick: string; usuario_nombre: string | null }[];
};

export function parseMixedPayments(raw: unknown): MixedPayment[] {
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try { parsed = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((item: Record<string, unknown>) => ({
      metodo: String(item?.metodo || ''),
      monto: Number(item?.monto || 0)
    }))
    .filter((item: MixedPayment) => item.metodo && item.monto > 0);
}

export function normalizeSolicitudStatus(status: string): 'confirmada' | 'rechazada' {
  const normalized = String(status || '').toLowerCase();
  return normalized === 'aprobado' || normalized === 'confirmado' || normalized === 'confirmada'
    ? 'confirmada'
    : 'rechazada';
}

export function allocateProportionally<T>(
  rows: T[],
  getAmount: (row: T) => number,
  targetTotal: number
): AllocationRow<T>[] {
  const normalizedTarget = Math.max(0, Math.round(Number(targetTotal || 0)));
  const baseRows = rows.map(row => ({
    ...row,
    currentAmount: Math.max(0, Math.round(Number(getAmount(row) || 0)))
  }));
  const currentTotal = baseRows.reduce((sum, row) => sum + row.currentAmount, 0);
  if (currentTotal <= 0 || normalizedTarget <= 0) {
    return baseRows.map(row => ({ ...row, nextAmount: 0 }));
  }
  const allocated = baseRows.map(row => ({
    ...row,
    nextAmount: Math.floor((row.currentAmount * normalizedTarget) / currentTotal)
  }));
  let assigned = allocated.reduce((sum, row) => sum + Number(row.nextAmount || 0), 0);
  let remainder = Math.max(0, normalizedTarget - assigned);
  let cursor = 0;
  while (remainder > 0 && allocated.length > 0) {
    allocated[cursor % allocated.length].nextAmount =
      Number(allocated[cursor % allocated.length].nextAmount || 0) + 1;
    remainder -= 1;
    cursor += 1;
  }
  return allocated;
}

export function mapSaleFromDB(row: VentaRawRow | VentaGetByIdRow | null): SaleType | null {
  if (!row) return null;
  try {
    return SaleSchema.parse({
      id: row.id_venta,
      codigo: row.codigo,
      cliente_id: row.cliente_id,
      pedido_id: row.pedido_id,
      habitacion_id: row.habitacion_id,
      metodo_pago: typeof row.metodo_pago === 'string' ? row.metodo_pago.toLowerCase() : row.metodo_pago,
      metodologia_pago: row.metodo_pago_adicional,
      monto_prepago: row.monto_prepago,
      monto_adicional: row.monto_adicional,
      propina: Number(row.propina || 0),
      sub_total: Number(row.sub_total || 0),
      total: Number(row.total || 0),
      total_comision: Number(row.total_comision || 0),
      tiempo: Number(row.tiempo || 0),
      caja_id: row.caja_id,
      created_by: row.created_by,
      cajero_nick: row.staff_nick,
      estado: Number(row.estado ?? 1),
      fecha_crea: row.fecha_crea,
      fecha_mod: row.fecha_mod,
      cliente_nombre: row.cliente_nombre,
      habitacion_numero: row.habitacion_numero || row.habitacion_nombre,
      habitacion_nombre: row.habitacion_nombre,
      item_count: Number(row.item_count || 0),
      anfitrionas_nicks: row.anfitrionas_nicks || null,
      pagos_mixtos: row.pagos_mixtos ? parseMixedPayments(row.pagos_mixtos) : []
    });
  } catch (err) {
    logger.warn('[SaleRepository] Skipping invalid sale row:', { id: row.id_venta, err });
    return null;
  }
}
