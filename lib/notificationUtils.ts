/**
 * Dispara el evento para actualizar el contador de pedidos pendientes en el header
 * Esta función debe ser llamada desde el cliente (browser), no desde el servidor
 */
export function triggerPendingOrdersUpdate() {
  console.log('🔄 Disparando evento updatePendingOrders');
  const event = new CustomEvent('updatePendingOrders');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
}

/**
 * Dispara el evento para abrir el modal de un pedido específico
 * Esta función debe ser llamada desde el cliente (browser), no desde el servidor
 */
export function triggerOpenOrderModal(orderId: number) {
  console.log('📱 Disparando evento openOrderModal para pedido:', orderId);
  const event = new CustomEvent('openOrderModal', {
    detail: { orderId }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
} 