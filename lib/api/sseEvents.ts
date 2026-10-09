/**
 * Catálogo único de eventos SSE.
 *
 * Antes, `sendNotificationToAll` escribía cada evento a todos los clientes conectados sin
 * mirar quién era el cliente ni por qué canal llegaba. Aquí se declara, evento por evento,
 * quién puede recibirlo:
 *
 *  - `staff`  → cualquier sesión válida (eventos operativos del local).
 *  - `role`   → solo esos roles (datos personales o financieros).
 *  - `user`   → solo el usuario afectado por el evento.
 *  - `kiosk`  → proyección pública y reducida que consume la pantalla de asistencia.
 *
 * Dos reglas que este archivo hace cumplir:
 *
 *  1. Emitir un evento que no esté declarado es un error de tipo (`SseEventType`).
 *  2. El canal público (`kiosk`) solo recibe lo que su `project` devuelve. Es una lista
 *     blanca: un campo nuevo en el payload no se filtra solo, hay que proyectarlo a mano.
 */

export const STAFF_ROLES = [
  'administrador',
  'cajero',
  'garzon',
  'anfitriona',
  'barman',
  // Quien recibe envases en el almacén: hoy suele entrar como administrador,
  // pero el rol existe para el permiso products/confirm_container_return (033).
  'almacen'
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export type SseUserId = string | number;

export type SseAudience =
  | { readonly channel: 'staff' }
  | { readonly channel: 'role'; readonly roles: readonly StaffRole[] }
  | { readonly channel: 'user'; readonly idFrom: (data: any) => SseUserId | null | undefined }
  | { readonly channel: 'kiosk'; readonly project: (data: any) => Record<string, unknown> };

export interface SseEventPolicy {
  readonly audiences: readonly SseAudience[];
}

/** Cualquier sesión válida. */
const STAFF_ONLY: readonly SseAudience[] = [{ channel: 'staff' }];

/** Datos personales o de dinero: hoy solo el administrador los necesita. */
const ADMIN_ONLY: readonly SseAudience[] = [{ channel: 'role', roles: ['administrador'] }];

/**
 * Evento dirigido a una sola persona (el payload trae su id).
 */
const ownUser = (): SseAudience => ({ channel: 'user', idFrom: data => data?.userId ?? data?.id });

/** El personal que no administra: consume permisos y roles, no los edita. */
const NON_ADMIN_STAFF: readonly SseAudience[] = [
  { channel: 'role', roles: ['cajero', 'garzon', 'anfitriona', 'barman'] }
];

/** Quienes sirven el bar y quienes lo administran (avisos de botellas por agotarse). */
const BAR_STAFF: readonly SseAudience[] = [{ channel: 'role', roles: ['barman', 'administrador'] }];

/** Quienes reciben envases en el almacén y quienes administran (recepciones atrasadas). */
const WAREHOUSE_STAFF: readonly SseAudience[] = [
  { channel: 'role', roles: ['administrador', 'almacen'] }
];

/** Aprobación de entregas físicas: administración y caja revisan cada lote. */
const CONTAINER_APPROVERS: readonly SseAudience[] = [
  { channel: 'role', roles: ['administrador', 'cajero'] }
];

export const SSE_EVENTS = {
  // ─── Operativos: los ve cualquier sesión válida ─────────────────────────────
  new_order: { audiences: STAFF_ONLY },
  order_updated: { audiences: STAFF_ONLY },
  order_deleted: { audiences: STAFF_ONLY },
  new_service_request: { audiences: STAFF_ONLY },
  service_request_processed: { audiences: STAFF_ONLY },
  service_request_deleted: { audiences: STAFF_ONLY },
  service_changed: { audiences: STAFF_ONLY },
  // ─── Transferencias almacén → bar ────────────────────────────────────────────
  // Se emite al crear una solicitud y al aprobarla/rechazarla el Barman: el
  // módulo Transferencias se refresca en vivo en todas las sesiones
  // (payload { action: 'created' | 'accepted' | 'rejected', ... }).
  transfers_updated: { audiences: STAFF_ONLY },
  categories_updated: { audiences: STAFF_ONLY },
  timers_updated: { audiences: STAFF_ONLY },
  timer_started: { audiences: STAFF_ONLY },
  timer_updated: { audiences: STAFF_ONLY },
  timer_stopped: { audiences: STAFF_ONLY },
  timer_warning_5m: { audiences: STAFF_ONLY },
  timer_ended_event: { audiences: STAFF_ONLY },
  room_available: { audiences: STAFF_ONLY },
  updateSales: { audiences: STAFF_ONLY },
  sale_cancelled: { audiences: STAFF_ONLY },
  anulacion_processed: { audiences: STAFF_ONLY },
  check_attendance: { audiences: STAFF_ONLY },
  assistance_request: { audiences: STAFF_ONLY },
  staff_call_accepted: { audiences: STAFF_ONLY },

  // ─── Caché de autorización y sesión ────────────────────────────────────────
  // Los clientes no administradores refrescan sus permisos al recibirlo (cada uno
  // compara su propio rol/usuario); los administradores no lo necesitan.
  'permissions-updated': { audiences: NON_ADMIN_STAFF },
  // El cierre autorizado de caja termina la sesión del personal en todas las pestañas.
  // Los administradores no reciben este evento y conservan su sesión.
  cash_register_closed: { audiences: NON_ADMIN_STAFF },
  // El payload trae el roleId eliminado: cada cliente decide si era el suyo. Se
  // difunde al personal porque la sesión no lleva roleId y no se puede dirigir
  // desde el servidor sin una consulta por cliente.
  'role-deleted': { audiences: NON_ADMIN_STAFF },
  // Dirigido: solo la persona expulsada (payload { userId, message? }).
  force_logout: {
    audiences: [ownUser()]
  },

  // ─── Personales o financieros: solo administración ──────────────────────────
  ANTICIPO_PROCESSED: { audiences: ADMIN_ONLY },
  anticipo_processed: { audiences: ADMIN_ONLY },
  anticipo_delivered: { audiences: ADMIN_ONLY },
  new_anticipo_request: { audiences: ADMIN_ONLY },
  new_gratificacion_request: { audiences: ADMIN_ONLY },
  gratificacion_processed: { audiences: ADMIN_ONLY },
  security_alert: { audiences: ADMIN_ONLY },

  // ─── Bar: una botella abierta bajó del umbral de shots restantes ───────────
  // Lo dispara la venta que cruza el umbral; lo ven quienes sirven y quienes
  // administran (payload { alertas, mensaje }).
  bar_shot_alert: { audiences: BAR_STAFF },

  // ─── Almacén: un envase entregado lleva más de 2 horas sin recibir ─────────
  // Lo dispara el chequeo periódico del control de envases (cron y contador del
  // panel); lo ven quienes reciben envases y quienes administran (payload
  // { pendientes, vencidos, umbral_horas, mensaje }).
  warehouse_container_alert: { audiences: WAREHOUSE_STAFF },
  // Comparación del lote escaneado por el bar, incluyendo códigos no encontrados.
  container_return_pending: { audiences: CONTAINER_APPROVERS },

  // ─── Dirigidos: solo el usuario afectado (y la pantalla del local) ──────────
  // `qr_token_updated` desaparecio con la credencial personal: ya no hay token que
  // rotar. Quien necesite saber que su QR cambio, lo pide a la pantalla del local.
  profile_updated: {
    audiences: [ownUser(), { channel: 'kiosk', project: data => ({ userId: data?.userId }) }]
  },

  // ─── Pantalla pública de asistencia ─────────────────────────────────────────
  // El kiosko recibe la proyección pública; el personal (pantalla Cajero/Personal)
  // recibe el payload completo y filtra localmente por `user.id` para cerrar el
  // modal de desafío cuando la persona confirmó su asistencia.
  attendance_registered: {
    audiences: [
      { channel: 'staff' },
      {
        channel: 'kiosk',
        project: data => ({
          user: {
            id: data?.user?.id,
            nombre: data?.user?.nombre,
            apellido: data?.user?.apellido
          }
        })
      }
    ]
  },
  // El lector volvió a cotejar a alguien que ya marcó hoy (una asistencia por
  // día). Solo al personal: la pantalla del local no cambia con esto, solo el
  // toast "el usuario ya tiene asistencia registrada".
  attendance_duplicate: { audiences: STAFF_ONLY },
  code_changed: {
    audiences: [
      { channel: 'staff' },
      { channel: 'kiosk', project: data => ({ codigo: data?.codigo }) }
    ]
  }
} as const satisfies Record<string, SseEventPolicy>;

export type SseEventType = keyof typeof SSE_EVENTS;

export const SSE_EVENT_TYPES = Object.keys(SSE_EVENTS) as SseEventType[];

export interface SseSubscriberContext {
  channel: 'staff' | 'kiosk';
  userId?: SseUserId | null;
  role?: string | null;
}

export function normalizeRole(role?: string | null): StaffRole | null {
  if (!role) return null;
  const normalized = role.trim().toLowerCase();
  return (STAFF_ROLES as readonly string[]).includes(normalized) ? (normalized as StaffRole) : null;
}

export function isSseEventType(type: string): type is SseEventType {
  return Object.prototype.hasOwnProperty.call(SSE_EVENTS, type);
}

/**
 * Devuelve el payload que le corresponde a este suscriptor, o `null` si el evento no
 * le corresponde y por lo tanto no hay nada que enviarle.
 */
/**
 * Un evento a entregar. Los argumentos van con nombre a propósito: `data` es libre y
 * `subscriber` es un objeto, así que por posición el orden se confunde con facilidad.
 */
export interface SseEventInput {
  type: SseEventType;
  data?: any;
  subscriber: SseSubscriberContext;
}

/**
 * Devuelve el payload que le corresponde a este suscriptor, o `null` si el evento no
 * le corresponde y por lo tanto no hay nada que enviarle.
 */
export function resolvePayload({
  type,
  data,
  subscriber
}: SseEventInput): Record<string, unknown> | null {
  const audiences = SSE_EVENTS[type].audiences;

  if (subscriber.channel === 'kiosk') {
    const kiosk = audiences.find(audience => audience.channel === 'kiosk');
    return kiosk && kiosk.channel === 'kiosk' ? kiosk.project(data) : null;
  }

  for (const audience of audiences) {
    if (audience.channel === 'staff') return data ?? {};
    if (audience.channel === 'role') {
      const role = normalizeRole(subscriber.role);
      if (role && audience.roles.includes(role)) return data ?? {};
    }
    if (audience.channel === 'user') {
      const target = audience.idFrom(data);
      if (
        target != null &&
        subscriber.userId != null &&
        String(target) === String(subscriber.userId)
      ) {
        return data ?? {};
      }
    }
  }

  return null;
}

export function canReceive(input: SseEventInput): boolean {
  return resolvePayload(input) !== null;
}

/** Frame SSE listo para escribir, o `null` si este suscriptor no debe recibirlo. */
export function buildFrame(input: SseEventInput, timestamp: string): string | null {
  const payload = resolvePayload(input);
  if (!payload) return null;
  return `data: ${JSON.stringify({ type: input.type, data: payload, timestamp })}\n\n`;
}
