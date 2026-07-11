'use client';

import { useMemo } from 'react';
import { useCuentaDetail } from '@/hooks/cuentas';
import { summarizeCuentaDetalles } from '@/lib/utils/cuentas';
import type { CuentaAnulacionItem, CuentaRoomHistoryItem } from '@/types/cuenta';

interface ProductRow {
  id_producto: number | string;
  nombre: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  categoria_nombre: string;
  comision: number;
  selectedHostesses: string[];
}

interface CommissionRow {
  id: string;
  nombre: string;
  comision: number;
}

interface UseCuentaDetailModalReturn {
  // From useCuentaDetail
  cuenta: any;
  loading: boolean;
  hasFetched: boolean;
  handleClose: () => void;
  getEstadoBadge: (estado: number | string) => {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
  };

  // Computed
  detalleResumen: ReturnType<typeof summarizeCuentaDetalles>;
  estadoBadge: {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'success' | 'outline';
  } | null;
  showLoading: boolean;
  resumenFinanciero: any;
  historialHabitaciones: CuentaRoomHistoryItem[];
  solicitudesAnulacion: CuentaAnulacionItem[];
  productosTabla: ProductRow[];
  comisionPorAnfitriona: CommissionRow[];
}

export function useCuentaDetailModal(
  cuentaId: string | number | null,
  open: boolean
): UseCuentaDetailModalReturn {
  const { cuenta, loading, hasFetched, handleClose, getEstadoBadge } = useCuentaDetail(
    cuentaId ? String(cuentaId) : null,
    open
  );

  const detalleResumen = useMemo(
    () => summarizeCuentaDetalles(cuenta?.detalles ?? []),
    [cuenta?.detalles]
  );

  const estadoBadge = cuenta ? getEstadoBadge(cuenta.estado) : null;
  const showLoading = loading || (open && !hasFetched);
  const resumenFinanciero = cuenta?.resumen_financiero;
  const historialHabitaciones = (cuenta?.habitaciones_historial_data ??
    []) as CuentaRoomHistoryItem[];
  const solicitudesAnulacion = (cuenta?.solicitudes_anulacion ?? []) as CuentaAnulacionItem[];

  const productosTabla = useMemo(
    () =>
      detalleResumen.groupedDetalles.map((detalle, index) => {
        const hostessIds = detalle.hostess_id
          ? String(detalle.hostess_id)
              .split(',')
              .map((id: string) => id.trim())
          : [];
        return {
          id_producto: detalle.id_producto ?? detalle.producto_id ?? detalle.agrupacionKey ?? index,
          nombre:
            detalle.producto ||
            detalle.nombre ||
            `Producto ID: ${detalle.id_producto ?? detalle.producto_id ?? '-'}`,
          precio: detalle.precio || 0,
          cantidad: detalle.cantidad || 0,
          sub_total: detalle.sub_total || 0,
          categoria_nombre: detalle.categoria || detalle.categoria_nombre || '',
          comision: detalle.comision || 0,
          selectedHostesses: hostessIds
        };
      }),
    [detalleResumen.groupedDetalles]
  );

  const usuariosCuenta = useMemo(() => cuenta?.usuarios ?? [], [cuenta?.usuarios]);

  const comisionPorAnfitriona = useMemo(() => {
    if (usuariosCuenta.length === 0 || detalleResumen.totalComision <= 0) return [];

    return usuariosCuenta.map((usuario: any) => {
      const usuarioId = String(usuario.usuario_id || usuario.id_usuario || usuario.id || '');
      const comisionTotal = detalleResumen.groupedDetalles.reduce((sum, item) => {
        const hostessIds = item.hostess_id
          ? String(item.hostess_id)
              .split(',')
              .map((id: string) => id.trim())
              .filter(Boolean)
          : [];
        if (hostessIds.length > 0 && hostessIds.includes(usuarioId)) {
          const comisionPorAnfitriona = (item.comision || 0) / hostessIds.length;
          return sum + comisionPorAnfitriona;
        }
        return sum;
      }, 0);

      return {
        id: usuarioId,
        nombre: usuario.usuario_nombre || usuario.nick || usuario.nombre || 'Anfitriona',
        comision: comisionTotal
      };
    });
  }, [usuariosCuenta, detalleResumen]);

  return {
    cuenta,
    loading,
    hasFetched,
    handleClose,
    getEstadoBadge,
    detalleResumen,
    estadoBadge,
    showLoading,
    resumenFinanciero,
    historialHabitaciones,
    solicitudesAnulacion,
    productosTabla,
    comisionPorAnfitriona
  };
}
