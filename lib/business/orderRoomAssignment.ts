type OrderDetail = {
  comision: number;
  cantidad: number;
  subtotal: number;
  generaComision: number;
  precio: number;
  hostessId?: string | null;
  selectedHostesses: string[];
  roomId?: string | null;
  productoId: string;
};

export function hasSpecialHostessProducts(detalles: OrderDetail[]) {
  return detalles.some((d) => {
    const precio = d.precio || 0;
    const tieneAnfitrionas = (d.selectedHostesses && d.selectedHostesses.length > 0) || d.hostessId;
    return precio >= 30000 && tieneAnfitrionas;
  });
}

export function applyAutoRoomToDetails(detalles: OrderDetail[], roomId: string) {
  return detalles.map((detalle) => {
    const precio = detalle.precio || 0;
    const tieneAnfitrionas =
      detalle.hostessId || (detalle.selectedHostesses && detalle.selectedHostesses.length > 0);

    if (precio >= 30000 && tieneAnfitrionas && !detalle.roomId) {
      return {
        ...detalle,
        roomId,
      };
    }

    return detalle;
  });
}
