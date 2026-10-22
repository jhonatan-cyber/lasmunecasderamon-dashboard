export const ROUTES = {
  CONFIRMAR_ANULACION: '/confirm-cancellation',
  CONFIRMAR_ANULACION_SERVICIO: '/confirm-service-cancellation',
  CONFIRMAR_ANULACION_CUENTA: '/confirm-account-cancellation',
  CONFIRMAR_ANTICIPO: '/confirm-advance',
  CONFIRMAR_GRATIFICACION: '/confirm-gratification',
  /** Autorizacion del cierre de caja que pide el cajero y aprueba el administrador. */
  CONFIRMAR_CIERRE_CAJA: '/confirm-cash-closing'
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.CONFIRMAR_ANULACION,
  ROUTES.CONFIRMAR_ANULACION_SERVICIO,
  ROUTES.CONFIRMAR_ANULACION_CUENTA,
  ROUTES.CONFIRMAR_ANTICIPO,
  ROUTES.CONFIRMAR_GRATIFICACION,
  ROUTES.CONFIRMAR_CIERRE_CAJA
] as const;

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}
