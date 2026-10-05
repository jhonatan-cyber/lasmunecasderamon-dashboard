/**
 * Contratos del módulo de Operación — §5: «DTO y esquemas aptos para consumidores».
 *
 * Operación es dueño de cuentas, servicios, habitaciones, pedidos y
 * temporizadores. Lo que sale de aquí son filas con el cliente y la habitación ya
 * resueltos: ninguna ruta ve columnas del driver ni SQL.
 *
 * Las dos solicitudes de anulación (cuenta y servicio) siguen la misma forma que
 * la de ventas: se crean desde caja, se consultan por token desde la página de
 * confirmación y las procesa el flujo de WhatsApp.
 */

/** Solicitud de anulación de servicio con el servicio, cliente y habitación. */
export interface SolicitudAnulacionServicio {
  id: string;
  token: string;
  estado: string;
  motivo: string | null;
  solicitado_por: string | null;
  fecha_solicitud: string;
  servicio_id: string;
  codigo: string;
  total: number;
  cliente_nombre: string;
  habitacion_numero: string;
}

/** Datos del servicio que la ruta necesita para el aviso de WhatsApp. */
export interface ServicioParaAnulacion {
  codigo: string;
  total: number;
  tiempo: number;
  habitacion_nombre: string | null;
  cliente_nombre: string;
}

/** Token y datos que devuelve la ruta al crear una solicitud de servicio. */
export interface SolicitudAnulacionServicioRegistrada {
  token: string;
}

/** Solicitud de anulación de cuenta con la cuenta y su cliente. */
export interface SolicitudAnulacionCuenta {
  id: string;
  estado: string;
  motivo: string | null;
  monto: number | null;
  fecha_crea: string;
  cuenta_id: string;
  codigo: string;
  total: number;
  cliente_nombre: string;
}

/** Datos de la cuenta que la ruta necesita para el aviso de WhatsApp. */
export interface CuentaParaAnulacion {
  codigo: string;
  total: number;
  cliente_nombre: string;
}

/** Creación de una solicitud de anulación de servicio. */
export interface EntradaSolicitudAnulacionServicio {
  servicioId: string | number;
  motivo: string;
}
