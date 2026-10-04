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
