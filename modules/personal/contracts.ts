/**
 * Contratos públicos del módulo Personal — horas extras.
 *
 * Sólo tipos aptos para consumidores (§5): nada de implementaciones de
 * servidor, filas del driver ni tipos de repositorio. Las formas replican las
 * respuestas HTTP que la UI ya consume; cambiarlas es un cambio de contrato
 * HTTP, no un detalle de la migración.
 */

/** Registro de horas extras tal como lo devuelve el listado, con el usuario. */
export interface HoraExtra {
  id_hora_extra: string;
  id_usuario: string;
  usuario: string;
  usuario_foto: string;
  hora: number;
  monto: number;
  total: number;
  fecha_crea: string;
  fecha_mod: string;
  estado: number;
}

/**
 * Fila devuelta al registrar: es el resultado de `SELECT *` sobre
 * `horas_extras`, y la ruta la devuelve dentro de `{ id }` tal cual. Los
 * campos conocidos van tipados y la llave queda abierta porque la tabla puede
 * añadir columnas sin que este contrato cambie; la respuesta HTTP se preserva.
 */
export interface HoraExtraRegistrada {
  id_hora_extra: string;
  usuario_id: string;
  hora: number;
  monto: number;
  total: number;
  fecha_crea: string;
  estado: number;
  [campo: string]: unknown;
}

/** Filtros del listado. `desde` y `hasta` comparan la fecha de creación. */
export interface FiltrosHorasExtras {
  usuarioId?: string;
  desde?: string;
  hasta?: string;
}

/** Datos para registrar una hora extra; los mismos que acepta la API HTTP. */
export interface EntradaHoraExtra {
  usuario_id: string;
  hora: number;
  monto: number;
  device_date?: string;
}

/** Cambios parciales sobre un registro existente. */
export interface CambiosHoraExtra {
  hora?: number;
  monto?: number;
  estado?: number;
}

/* Anticipos */

/** Filtros del listado administrativo. `startDate`/`endDate` son inclusivos. */
export interface FiltrosAnticipos {
  estado?: number;
  usuario_id?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fila del listado administrativo, con el empleado y quien lo entregó. Es la
 * forma que consume hoy la UI; los campos desconocidos pasan sin romper nada.
 */
export interface AnticipoListado {
  id_anticipo: string;
  usuario_id: string;
  name: string;
  nombre: string;
  lastName: string;
  apellido: string;
  nick: string;
  foto: string | null;
  fecha_crea: string;
  fecha_mod: string | null;
  fecha_aprobacion: string | null;
  fecha_cobro: string | null;
  monto: number;
  motivo: string | null;
  estado: number;
  entregado_por: string | null;
  fecha_entrega: string | null;
  entregado_por_nombre: string;
  entregado_por_apellido: string;
  [campo: string]: unknown;
}

/** Solicitudes activas de un usuario (estados 1, 2 y 3), con nombre y nick. */
export interface SolicitudAnticipoListado {
  id_anticipo: string;
  usuario_id: string;
  monto: number;
  motivo: string | null;
  estado: number;
  fecha_crea: string;
  usuario_nombre: string;
  nick: string;
  [campo: string]: unknown;
}

/** Datos para solicitar un anticipo; los mismos que acepta la API HTTP. */
export interface EntradaSolicitudAnticipo {
  monto: number;
  motivo: string;
  device_date?: string;
}

/** Lo que devuelve el alta de una solicitud: los datos conocidos, sin relectura. */
export interface SolicitudAnticipoRegistrada {
  id_anticipo: string;
  usuario_id: string;
  monto: number;
  motivo: string;
  estado: number;
  fecha_crea: string;
}

/**
 * Fila devuelta al otorgar o actualizar estado: resultado de un
 * `findOne` sobre `anticipos` que la ruta entrega tal cual.
 */
export interface AnticipoRegistrado {
  id_anticipo: string;
  usuario_id: string;
  monto: number;
  motivo: string | null;
  estado: number;
  fecha_crea: string;
  [campo: string]: unknown;
}

/** Resultado de procesar o entregar una solicitud. */
export interface ResultadoProceso {
  ok: boolean;
  id: string;
}

/** Resumen de un anticipo pendiente dentro de un comando de WhatsApp. */
export interface PendienteAnticipo {
  id: string;
  empleado_nombre: string;
}

/** Respuesta del procesamiento por comando de WhatsApp. */
export interface ResultadoComando {
  ok: boolean;
  message: string;
}

export interface EntradaPropinaVenta {
  venta_id: string;
  monto: number;
  usuario_ids?: string[];
}
export interface ComisionVenta {
  id_comision: string;
  venta_id: string;
  usuario_id: string;
  monto: number;
  estado: number;
  fecha_crea: string;
}
export interface DetalleComisionVenta {
  id_detalle_comision: string;
  comision_id: string;
  usuario_id: string;
  comision: number;
  estado: number;
  fecha_crea: string;
}
