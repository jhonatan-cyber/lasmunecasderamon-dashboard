/**
 * Shared types for repository query results.
 * These represent the shapes returned by SQL queries in the repository layer.
 */

// ── Event queries ────────────────────────────────────────────────────

export interface WeeklyIncomeRow {
  day: string;
  total: number;
}

export interface UserEventRow {
  type: string;
  id: string;
  date: string;
  amount: number;
  codigo: string;
  estado: number;
  subType: string | null;
}

export interface PropinaDetailRow {
  id_detalle_propina: string;
  monto: number;
  estado: number;
  fecha_crea: string;
  usuario_id: string;
  id_propina: string;
  monto_total: number;
  estado_propina: number;
  fecha_crea_propina: string;
  venta_id: string | null;
  codigo_venta: string | null;
  fecha_venta: string | null;
  total_venta: number | null;
  metodo_pago: string | null;
  estado_venta: number | null;
  habitacion_id: string | null;
  habitacion_nombre: string | null;
  cajero_nick: string | null;
  cajero_nombre: string | null;
}

export interface ComisionDetailRow {
  id_detalle_comision: string;
  comision: number;
  estado: number;
  fecha_crea: string;
  usuario_id: string;
  id_comision: string;
  monto_total: number;
  estado_comision: number;
  venta_id: string | null;
  servicio_id: string | null;
  codigo_venta: string | null;
  fecha_venta: string | null;
  total_venta: number | null;
  habitacion_id: string | null;
  habitacion_nombre: string | null;
  codigo_servicio: string | null;
  fecha_servicio: string | null;
  total_servicio: number | null;
  estado_servicio: number | null;
  tiempo: number | null;
  cajero_nick: string | null;
  cajero_nombre: string | null;
}

export interface AsistenciaDetailRow {
  id_asistencia: string;
  fecha: string;
  hora: string;
  estado: number;
  id_usuario: string;
  nick: string;
  nombre: string;
  apellido: string;
  foto: string | null;
  sueldo: number;
  aporte: number;
  rol: string | null;
}

export interface AnticipoDetailRow {
  id_anticipo: string;
  monto: number;
  estado: number;
  fecha_crea: string;
  fecha_mod: string | null;
  motivo: string;
  usuario_id: string;
  id_usuario: string;
  nick: string;
  nombre: string;
  apellido: string;
  foto: string | null;
}

export interface ServicioDetailRow {
  id_servicio: string;
  codigo: string;
  fecha_crea: string;
  total: number;
  metodo_pago: string;
  estado: number;
  habitacion_id: string | null;
  cliente_id: string | null;
  tiempo: number | null;
  habitacion_nombre: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cajero_nick: string | null;
  cajero_nombre: string | null;
}

export interface VentaDetailRow {
  id_venta: string;
  codigo: string;
  fecha_crea: string;
  total: number;
  propina: number;
  total_comision: number;
  metodo_pago: string;
  estado: number;
  habitacion_id: string | null;
  cliente_id: string | null;
  habitacion_nombre: string | null;
  cliente_nombre: string | null;
  cliente_telefono: string | null;
  cajero_nick: string | null;
  cajero_nombre: string | null;
}

export interface GratificacionDetailRow {
  id: string;
  monto: number;
  descripcion: string | null;
  estado: number;
  fecha_crea: string;
  usuario_id: string;
  nick: string;
  nombre: string;
  apellido: string;
  foto: string | null;
}

export interface HoraExtraDetailRow {
  id_hora_extra: string;
  hora: number;
  total: number;
  estado: number;
  fecha_crea: string;
  usuario_id: string;
  nick: string;
  nombre: string;
  apellido: string;
  foto: string | null;
}

export interface UsuarioBasico {
  id_usuario: string;
  nick: string;
  nombre: string;
  apellido: string;
  foto?: string | null;
}

export interface DetalleVentaRow {
  cantidad: number;
  sub_total: number;
  subtotal: number;
  producto_nombre: string;
}

export interface PropinaDetalleRow {
  monto: number;
  nick: string;
  nombre: string;
  apellido: string;
}

export interface ComisionServicioRow {
  comision: number;
  id_usuario: string;
  nick: string;
  nombre: string;
  apellido: string;
}

export interface HistorialAnticipoRow {
  accion: string;
  fecha_crea: string;
  usuario_accion_nick: string | null;
}

export interface TableCheckRow {
  table_name: string;
}

// ── Stats queries ────────────────────────────────────────────────────

export interface CountRow {
  count: number;
  total: number;
}

export interface ComparisonRow {
  sales_today: number;
  sales_yesterday: number;
  services_today: number;
  services_yesterday: number;
  sales_count_week: number;
  sales_count_previous_week: number;
  sales_total_week: number;
  sales_total_previous_week: number;
  sales_same_time_today: number;
  sales_same_time_yesterday: number;
}

export interface RankingRow {
  ranking_type: string;
  item_name: string;
  primary_value: number;
  secondary_value: number;
}

export interface ActivityRow {
  type: string;
  id: string;
  codigo: string | null;
  amount: number;
  date: string;
  user_id: string | null;
  estado: number;
}

export interface HabitacionStatsRow {
  monto_servicio: number;
  monto_habitacion: number;
  monto_iva: number;
  comisiones_habitacion: number;
  total_generado: number;
}

export interface CajaRow {
  id_caja: string;
  fecha_apertura: string;
  usuario_id_apertura: string;
  monto_apertura: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  comision: number;
  anticipo: number;
  devolucion: number;
  iva: number;
  horas_abierta: number;
  minutos_abierta: number;
}

export interface CajaStatsRow {
  total_ventas: number;
  cantidad_ventas: number;
  promedio_venta: number;
  total_ventas_efectivo: number;
  total_ventas_tarjeta: number;
  total_ventas_transferencia: number;
  total_servicios: number;
  cantidad_servicios: number;
  promedio_servicio: number;
}

export interface GeneralCajaRow {
  cajas_abiertas: number;
  cajas_cerradas: number;
  total_cajas: number;
}

export interface TotalRow {
  total: number;
}

export interface RoleRow {
  id_rol: string;
  nombre: string;
}

export interface UserRoleRow {
  id_usuario: string;
  nick: string;
  estado: number;
  rol_id: string;
  rol_nombre: string;
}

export interface SalesByMonthRow {
  mes: string;
  cantidad_ventas: number;
  total_ventas: number;
}

export interface SalesByWeekRow {
  semana: string;
  dia_semana: string;
  fecha_inicio: string;
  orden: number;
  total: number;
  cantidad: number;
}

// ── Sale queries ─────────────────────────────────────────────────────

export interface VentaRow {
  id_venta: string;
  codigo: string;
  cliente_id: string | null;
  pedido_id: string | null;
  habitacion_id: string | null;
  metodo_pago: string;
  propina: number;
  sub_total: number;
  total: number;
  total_comision: number;
  estado: number;
  fecha_crea: string;
  fecha_mod: string | null;
  pagos_mixtos: string | null;
  caja_id: string | null;
  created_by: string | null;
  tiempo: number | null;
}

export interface DetalleVentaCompletoRow {
  id_detalle_venta: string;
  venta_id: string;
  producto_id: string;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  producto_nombre: string | null;
  producto_precio: number | null;
}

export interface VentaUsuarioRow {
  usuario_id: string;
  nick: string;
  usuario_nombre: string;
}

export interface VentaComisionRow {
  nick: string;
  foto: string | null;
  monto: number;
}

export interface VentaPropinaRow {
  usuario_id: string;
  nick: string;
  nombre: string;
  apellido: string;
  foto: string | null;
  monto: number;
}

export interface VentaResumenRow {
  total_ventas: number;
  efectivo: number;
  tarjeta: number;
  transferencia: number;
  prepago: number;
  total_propinas: number;
}

// ── Cuenta queries ───────────────────────────────────────────────────

export interface CuentaRow {
  id_cuenta: string;
  codigo: string;
  cliente_id: string | null;
  habitacion_id: string | null;
  total: number;
  sub_total: number;
  total_comision: number;
  propina: number;
  estado: number;
  tiempo: number;
  tiempo_actual: number | null;
  tiempo_inicio_actual: string | null;
  habitaciones_historial: string | null;
  fecha_crea: string;
  fecha_mod: string | null;
  metodo_pago: string | null;
  created_by: string | null;
  cobrado_por: string | null;
}

export interface DetalleCuentaRow {
  id_detalle_cuenta: string;
  cuenta_id: string;
  producto_id: string;
  precio: number;
  cantidad: number;
  sub_total: number;
  comision: number;
  hostess_id: string | null;
  fecha_crea: string;
  created_by: string | null;
  hostess_nick: string | null;
  hostess_foto: string | null;
  added_by: string | null;
  added_by_foto: string | null;
  producto: string | null;
  categoria: string | null;
}

export interface CuentaUsuarioRow {
  id_cuenta_usuario: string;
  cuenta_id: string;
  usuario_id: string;
  fecha_crea: string;
  usuario_nombre: string | null;
  usuario_foto: string | null;
}

export interface SolicitudAnulacionRow {
  id: string;
  monto: number;
  motivo: string;
  estado: string;
  fecha_crea: string;
  fecha_mod: string | null;
  requested_by_nombre: string | null;
  approved_by_nombre: string | null;
}

export interface CuentaResumenRow {
  total_por_cobrar: number;
}

export interface HabitacionRow {
  nombre: string;
  precio?: number;
  tiempo?: number;
  comision_anfitriona?: number;
}

export interface ClienteRow {
  nombre: string;
  saldo?: number;
}

/** Cuenta row with JOINed columns (habitacion, cajero, counts) */
export interface CuentaJoinRow extends CuentaRow {
  tiempo_activo?: number | null;
  tiempo_total?: number | null;
  cliente_nombre?: string | null;
  cliente_saldo?: number | null;
  habitacion_numero?: string | null;
  nombre_cajero?: string | null;
  total_detalles?: number | null;
  total_usuarios?: number | null;
}

/** Cuenta row with cajero + cobraodr JOINs for getById */
export interface CuentaGetByIdRow extends CuentaJoinRow {
  foto_cajero?: string | null;
  nombre_cobrador?: string | null;
  foto_cobrador?: string | null;
}

/** Simple row with sub_total and total_comision for updateCuenta */
export interface CuentaTotalesRow {
  sub_total: number;
  total_comision: number;
}

/** Row for requestAnulacion query */
export interface CuentaRequestAnulacionRow {
  id_cuenta: string;
  estado: number;
  tiempo_actual: number | null;
  tiempo_inicio_actual: string | null;
  total: number;
  habitacion_id: string | null;
  habitaciones_historial: string | null;
  fecha_crea: string;
  habitacion_numero: string | null;
}

// ── Sale-specific query rows ────────────────────────────────────────

/** Row returned by SELECT habitacion_id, tiempo FROM ventas */
export interface VentaStateRow {
  habitacion_id: string | null;
  tiempo: number | null;
}

/** Row returned by SELECT * FROM ventas in anulacion/approval context */
export interface VentaAnulacionRow extends VentaRow {
  metodo_pago_adicional?: string | null;
  monto_prepago?: number | null;
  monto_adicional?: number | null;
}

/** Row returned by SELECT COALESCE(SUM(monto), 0) as total_prepago */
export interface PrepagoRow {
  total_prepago: number;
}

/** Row returned by comisiones + detalle_comisiones join */
export interface ComisionAnulacionRow {
  id_comision: string;
  monto: number;
  id_detalle_comision: string;
  comision: number;
}

/** Row returned by propinas header query */
export interface PropinaHeaderRow {
  id_propina: string;
  propina: number;
}

/** Row returned by detalle_propinas join propinas query */
export interface PropinaDetailAnulacionRow {
  id_detalle_propina: string;
  propina_id: string;
  monto: number;
}

/** Raw DB row for mapSaleFromDB — includes joined columns */
export interface VentaRawRow extends VentaRow {
  metodo_pago_adicional?: string | null;
  monto_prepago?: number | null;
  monto_adicional?: number | null;
  cliente_nombre?: string | null;
  habitacion_numero?: string | null;
  habitacion_nombre?: string | null;
  staff_nick?: string | null;
  item_count?: number | null;
  anfitrionas_nicks?: string | null;
  has_anulacion_solicitada?: number | null;
}

/** Row returned by the complex getById query with all JOINs */
export interface VentaGetByIdRow extends VentaRawRow {
  cajero_nick?: string | null;
  cajero_nombre?: string | null;
  cajero_apellido?: string | null;
  garzon_nombre?: string | null;
  productos_detalle?: string | null;
}

/** Row for detail_ventas + productos join */
export interface DetalleVentaWithProductRow {
  id: string;
  venta_id: string;
  producto_id: string | null;
  precio: number;
  comision: number;
  cantidad: number;
  sub_total: number;
  producto_nombre: string | null;
  producto_precio: number | null;
}

/** Row for ventas_usuarios join usuarios */
export interface VentaUsuarioDetailRow {
  usuario_id: string;
  nick: string;
  usuario_nombre: string | null;
}

/** Row for comisiones grouped by hostess */
export interface VentaComisionGroupRow {
  nick: string;
  foto: string | null;
  monto: number;
}

/** Row for propinas grouped by usuario */
export interface VentaPropinaGroupRow {
  usuario_id: string | null;
  nick: string | null;
  nombre: string | null;
  apellido: string | null;
  foto: string | null;
  monto: number;
}

/** Row for cajas open check */
export interface CajaIdRow {
  id_caja: string;
}

/** Row for ventas count */
export interface VentaCountRow {
  count: number;
}

/** Row for anulacion solicitud request lookup */
export interface SolicitudAnulacionVentaReqRow {
  venta_id: string;
}

/** Row for request monto lookup */
export interface SolicitudAnulacionMontoRow {
  monto: number;
}

/** Row for ventas_usuarios lookup */
export interface VentaAnfsRow {
  usuario_id: string;
}
