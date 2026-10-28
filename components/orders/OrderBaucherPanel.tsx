import { BaucherFoto } from '@/components/shared/BaucherFoto';

interface OrderBaucherPanelProps {
  /** Identificador del pedido: la foto se pide al endpoint autenticado por id. */
  orderId: string;
  codigo?: string | null;
}

/**
 * Baucher guardado del pedido, visible sólo cuando se cobró con transferencia.
 *
 * En `pedidos.baucher_foto` sólo queda el nombre del archivo; acá se arma la
 * ruta autenticada que lo sirve, así el listado nunca transporta la imagen.
 */
export function OrderBaucherPanel({ orderId, codigo }: OrderBaucherPanelProps) {
  return (
    <BaucherFoto
      src={`/api/orders/${orderId}/baucher`}
      descripcion={`Pedido ${codigo ?? orderId}`}
    />
  );
}
