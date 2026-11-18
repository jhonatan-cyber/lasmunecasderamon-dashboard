/**
 * Tipos de datos para cada evento SSE.
 *
 * Cada tipo describe la forma del payload que se envía con `sendNotificationToAll`.
 * Usar estos tipos en lugar de `any` para que TypeScript detecte campos faltantes
 * o mal escritos en tiempo de compilación.
 */

// ─── Operativos ─────────────────────────────────────────────────────────────

export interface NewOrderData {
  orderId?: string;
  id?: string;
  [key: string]: unknown;
}

export interface OrderUpdatedData {
  orderId: string;
  estado?: number;
  [key: string]: unknown;
}

export interface OrderDeletedData {
  orderId?: string;
  id?: string;
  [key: string]: unknown;
}

export interface NewServiceRequestData {
  servicioId: string;
  [key: string]: unknown;
}

export interface ServiceRequestProcessedData {
  id?: string;
  id_solicitud?: string;
  estado?: string;
  servicio_id?: string;
  [key: string]: unknown;
}

export interface ServiceRequestDeletedData {
  id: string;
  [key: string]: unknown;
}

export interface ServiceChangedData {
  action: string;
  id: string;
  [key: string]: unknown;
}

export interface TransfersUpdatedData {
  action: 'created' | 'accepted' | 'rejected';
  id?: string;
  producto_id?: string;
  presentacion_id?: string;
  cantidad?: number;
  usuario_id?: string | null;
  producto_nombre?: string | null;
  presentacion_nombre?: string | null;
  [key: string]: unknown;
}

export interface CategoriesUpdatedData {
  [key: string]: unknown;
}

export interface StockReplenishmentData {
  [key: string]: unknown;
}

export interface TimersUpdatedData {
  [key: string]: unknown;
}

export interface TimerStartedData {
  timerId?: string;
  servicioId?: string;
  [key: string]: unknown;
}

export interface TimerUpdatedData {
  timerId?: string;
  servicioId?: string;
  [key: string]: unknown;
}

export interface TimerStoppedData {
  timerId?: string;
  servicioId?: string;
  [key: string]: unknown;
}

export interface TimerWarning5mData {
  timerId?: string;
  id?: string;
  [key: string]: unknown;
}

export interface TimerEndedEventData {
  timerId?: string;
  id?: string;
  [key: string]: unknown;
}

export interface RoomAvailableData {
  roomId: string;
  [key: string]: unknown;
}

export interface UpdateSalesData {
  id: string;
  type: string;
  [key: string]: unknown;
}

export interface SaleCancelledData {
  id?: string;
  ventaId?: string;
  [key: string]: unknown;
}

export interface AnulacionProcessedData {
  [key: string]: unknown;
}

export interface CheckAttendanceData {
  roles: string[];
  message: string;
  [key: string]: unknown;
}

export interface AssistanceRequestData {
  id: string;
  servicioId: string;
  [key: string]: unknown;
}

export interface StaffCallAcceptedData {
  id: string;
  atendido_por_id: string;
  [key: string]: unknown;
}

export interface ResourceUpdatedData {
  module: string;
  [key: string]: unknown;
}

export interface PresenceUpdatedData {
  [key: string]: unknown;
}

export interface CleaningUpdatedData {
  [key: string]: unknown;
}

// ─── Caché de autorización y sesión ────────────────────────────────────────

export interface PermissionsUpdatedData {
  permissionId?: string;
  roleId?: string;
  source?: string;
}

export interface CashRegisterClosedData {
  [key: string]: unknown;
}

export interface RoleDeletedData {
  roleId: string;
}

export interface ForceLogoutData {
  userId: string | number;
  message?: string;
}

// ─── Personales o financieros ──────────────────────────────────────────────

export interface AnticipoProcessedData {
  [key: string]: unknown;
}

export interface AnticipoDeliveredData {
  [key: string]: unknown;
}

export interface NewAnticipoRequestData {
  [key: string]: unknown;
}

export interface NewGratificacionRequestData {
  [key: string]: unknown;
}

export interface GratificacionProcessedData {
  [key: string]: unknown;
}

export interface SecurityAlertData {
  [key: string]: unknown;
}

// ─── Bar ────────────────────────────────────────────────────────────────────

export interface BarShotAlertData {
  alertas: unknown[];
  mensaje: string;
}

// ─── Entradas ───────────────────────────────────────────────────────────────

export interface EntradaRegistradaData {
  id: string;
  grupo_registro_id: string;
  cliente_nombre: string;
  cantidad: number;
  monto_total: number;
  hora: string;
  [key: string]: unknown;
}

export interface EntradaActualizadaData {
  entradaId: string;
  accion: 'entregada' | 'anulada' | 'solicitud_anulacion';
  [key: string]: unknown;
}

// ─── Bodega ─────────────────────────────────────────────────────────────────

export interface WarehouseContainerAlertData {
  pendientes: number;
  vencidos: number;
  umbral_horas: number;
  mensaje: string;
}

export interface ContainerReturnPendingData {
  [key: string]: unknown;
}

// ─── Dirigidos ──────────────────────────────────────────────────────────────

export interface ProfileUpdatedData {
  userId: string | number;
  [key: string]: unknown;
}

// ─── Asistencia ─────────────────────────────────────────────────────────────

export interface AttendanceRegisteredData {
  user?: {
    id: string | number;
    nombre: string;
    apellido: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface AttendanceDuplicateData {
  [key: string]: unknown;
}

export interface CodeChangedData {
  codigo: string;
}

// ─── Connected / Ping (internos) ────────────────────────────────────────────

export interface ConnectedData {
  [key: string]: unknown;
}

export interface PingData {
  [key: string]: unknown;
}

// ─── Mapeo tipo → datos ─────────────────────────────────────────────────────

/**
 * Mapea cada tipo de evento SSE a su interfaz de datos correspondiente.
 * Usar `SseEventData<typeof type>` para obtener el tipo de datos de un evento.
 */
export interface SseEventMap {
  // Operativos
  new_order: NewOrderData;
  order_updated: OrderUpdatedData;
  order_deleted: OrderDeletedData;
  new_service_request: NewServiceRequestData;
  service_request_processed: ServiceRequestProcessedData;
  service_request_deleted: ServiceRequestDeletedData;
  service_changed: ServiceChangedData;
  transfers_updated: TransfersUpdatedData;
  categories_updated: CategoriesUpdatedData;
  stock_replenishment: StockReplenishmentData;
  timers_updated: TimersUpdatedData;
  timer_started: TimerStartedData;
  timer_updated: TimerUpdatedData;
  timer_stopped: TimerStoppedData;
  timer_warning_5m: TimerWarning5mData;
  timer_ended_event: TimerEndedEventData;
  room_available: RoomAvailableData;
  updateSales: UpdateSalesData;
  sale_cancelled: SaleCancelledData;
  anulacion_processed: AnulacionProcessedData;
  check_attendance: CheckAttendanceData;
  assistance_request: AssistanceRequestData;
  staff_call_accepted: StaffCallAcceptedData;
  resource_updated: ResourceUpdatedData;
  presence_updated: PresenceUpdatedData;
  cleaning_updated: CleaningUpdatedData;

  // Caché de autorización
  'permissions-updated': PermissionsUpdatedData;
  cash_register_closed: CashRegisterClosedData;
  'role-deleted': RoleDeletedData;
  force_logout: ForceLogoutData;

  // Personales
  ANTICIPO_PROCESSED: AnticipoProcessedData;
  anticipo_processed: AnticipoProcessedData;
  anticipo_delivered: AnticipoDeliveredData;
  new_anticipo_request: NewAnticipoRequestData;
  new_gratificacion_request: NewGratificacionRequestData;
  gratificacion_processed: GratificacionProcessedData;
  security_alert: SecurityAlertData;

  // Bar
  bar_shot_alert: BarShotAlertData;

  // Entradas
  entrada_registrada: EntradaRegistradaData;
  entrada_actualizada: EntradaActualizadaData;

  // Bodega
  warehouse_container_alert: WarehouseContainerAlertData;
  container_return_pending: ContainerReturnPendingData;

  // Dirigidos
  profile_updated: ProfileUpdatedData;

  // Asistencia
  attendance_registered: AttendanceRegisteredData;
  attendance_duplicate: AttendanceDuplicateData;
  code_changed: CodeChangedData;

  // Internos
  connected: ConnectedData;
  ping: PingData;
}

/**
 * Helper para obtener el tipo de datos de un evento SSE por su tipo.
 * Ejemplo: `SseEventData<'updateSales'>` → `UpdateSalesData`
 */
export type SseEventData<T extends keyof SseEventMap> = SseEventMap[T];

/**
 * Tipo genérico para datos SSE cuando el tipo de evento es desconocido.
 * Se usa en funciones que manejan cualquier evento.
 */
export type SseEventAllData = SseEventMap[keyof SseEventMap];
