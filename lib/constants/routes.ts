export const ROUTES = {
  CONFIRMAR_ANULACION: '/confirmar-anulacion',
  CONFIRMAR_ANULACION_SERVICIO: '/confirmar-anulacion-servicio',
  CONFIRMAR_ANULACION_CUENTA: '/confirmar-anulacion-cuenta',
  CONFIRMAR_ANTICIPO: '/confirmar-anticipo',
  CONFIRMAR_GRATIFICACION: '/confirmar-gratificacion',
  /** Autorizacion del cierre de caja que pide el cajero y aprueba el administrador. */
  CONFIRMAR_CIERRE_CAJA: '/confirmar-cierre-caja'
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
