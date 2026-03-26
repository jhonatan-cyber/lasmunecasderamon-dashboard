
export function triggerPendingOrdersUpdate() {

  const event = new CustomEvent('updatePendingOrders');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
}

export function triggerOpenOrderModal(orderId: number) {

  const event = new CustomEvent('openOrderModal', {
    detail: { orderId }
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(event);
  }
} 