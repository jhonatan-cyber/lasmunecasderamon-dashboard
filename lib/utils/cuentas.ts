export type CuentaDetalleLike = {
  id_producto?: string | number;
  producto_id?: string | number;
  producto?: string;
  nombre?: string;
  categoria?: string;
  categoria_nombre?: string;
  cantidad?: number;
  precio?: number;
  sub_total?: number;
  comision?: number;
  hostess_id?: string | number;
  hostess_nick?: string;
};

export type CuentaDetalleAgrupado = CuentaDetalleLike & {
  agrupacionKey: string;
  cantidad: number;
  sub_total: number;
  comision: number;
};

function getDetalleKey(detalle: CuentaDetalleLike, index: number) {
  return String(
    detalle.id_producto ?? detalle.producto_id ?? detalle.producto ?? `detalle-${index}`
  );
}

export function groupCuentaDetalles(detalles: CuentaDetalleLike[] = []) {
  const grouped = new Map<string, CuentaDetalleAgrupado>();

  detalles.forEach((detalle, index) => {
    const agrupacionKey = getDetalleKey(detalle, index);
    const existing = grouped.get(agrupacionKey);

    if (existing) {
      existing.cantidad += detalle.cantidad || 0;
      existing.sub_total += detalle.sub_total || 0;
      existing.comision += detalle.comision || 0;

      if (detalle.hostess_id && existing.hostess_id !== detalle.hostess_id) {
        existing.hostess_id = `${existing.hostess_id},${detalle.hostess_id}`;
      }
      if (detalle.hostess_nick && existing.hostess_nick !== detalle.hostess_nick) {
        existing.hostess_nick = existing.hostess_nick
          ? `${existing.hostess_nick}, ${detalle.hostess_nick}`
          : detalle.hostess_nick;
      }
      return;
    }

    grouped.set(agrupacionKey, {
      ...detalle,
      agrupacionKey,
      cantidad: detalle.cantidad || 0,
      sub_total: detalle.sub_total || 0,
      comision: detalle.comision || 0
    });
  });

  return Array.from(grouped.values());
}

export function summarizeCuentaDetalles(detalles: CuentaDetalleLike[] = []) {
  const groupedDetalles = groupCuentaDetalles(detalles);
  const uniqueProductCount = new Set(
    detalles.map((detalle, index) => getDetalleKey(detalle, index))
  ).size;

  const totalSubTotal = detalles.reduce((sum, detalle) => sum + (detalle.sub_total || 0), 0);
  const totalComision = detalles.reduce((sum, detalle) => sum + (detalle.comision || 0), 0);

  return {
    groupedDetalles,
    uniqueProductCount,
    totalSubTotal,
    totalComision
  };
}
