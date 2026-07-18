import { isExpensiveDrink } from '@/components/orders/productModalRules';

type OrderDetail = {
  comision: number;
  cantidad: number;
  subtotal: number;
  generaComision: number;
  precio: number;
  hostessId?: string | null;
  selectedHostesses: number[];
  roomId?: string | null;
  productoId: string;
};

export function hasSpecialHostessProducts(detalles: OrderDetail[]) {
  return detalles.some((d) => {
    const tieneAnfitrionas = (d.selectedHostesses && d.selectedHostesses.length > 0) || d.hostessId;
    return isExpensiveDrink(d) && tieneAnfitrionas;
  });
}

export function applyAutoRoomToDetails(detalles: OrderDetail[], roomId: string) {
  return detalles.map((detalle) => {
    const tieneAnfitrionas =
      detalle.hostessId || (detalle.selectedHostesses && detalle.selectedHostesses.length > 0);

    if (isExpensiveDrink(detalle) && tieneAnfitrionas && !detalle.roomId) {
      return {
        ...detalle,
        roomId,
      };
    }

    return detalle;
  });
}
