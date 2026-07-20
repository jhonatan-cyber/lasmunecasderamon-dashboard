import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/lib/integrations/pushNotifications';
import { enviarWhatsApp } from '@/lib/integrations/whatsappService';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { AuditRepository } from '@/lib/repositories/AuditRepository';
import { NotificationService } from './NotificationService';
import { logger } from '@/lib/utils/logger';

// ─── Tipos ───────────────────────────────────────────────────────

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertChannel = 'sse' | 'push' | 'whatsapp' | 'notification' | 'audit';
export type AlertType =
  | 'failed_logins'
  | 'permission_change'
  | 'mass_anulation'
  | 'suspicious_activity'
  | 'role_change'
  | 'password_reset'
  | 'mass_operation';

export interface SecurityAlert {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  details: Record<string, unknown>;
  userId?: string | number;
  ip?: string;
  channels?: AlertChannel[];
}

// ─── In-memory state para detección de umbrales ──────────────────

interface FailedLoginState {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil: number | null;
}

const failedLoginStore = new Map<string, FailedLoginState>();
const FAILED_LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutos
const FAILED_LOGIN_THRESHOLD = 5; // 5 intentos fallidos
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 min bloqueo
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Limpiar cada 5 min

// Limpieza periódica de estado expirado
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of failedLoginStore.entries()) {
    if (now - state.lastAttempt > FAILED_LOGIN_WINDOW && state.lockedUntil === null) {
      failedLoginStore.delete(key);
    }
  }
}, CLEANUP_INTERVAL).unref();

// ─── Servicio ─────────────────────────────────────────────────────

export class SecurityAlertService {
  /**
   * Detecta y alerta sobre múltiples intentos de login fallidos.
   * Retorna true si la cuenta está bloqueada.
   */
  static async checkFailedLogin(
    identifier: string,
    ip: string
  ): Promise<{ blocked: boolean; remainingAttempts: number }> {
    const now = Date.now();
    const key = `failed:${identifier}`;
    let state = failedLoginStore.get(key);

    // Si no hay estado o la ventana expiró, reiniciar
    if (!state || now - state.lastAttempt > FAILED_LOGIN_WINDOW) {
      state = { count: 1, firstAttempt: now, lastAttempt: now, lockedUntil: null };
      failedLoginStore.set(key, state);
      return { blocked: false, remainingAttempts: FAILED_LOGIN_THRESHOLD - 1 };
    }

    // Si está bloqueado, verificar si ya expiró el bloqueo
    if (state.lockedUntil) {
      if (now < state.lockedUntil) {
        const remainingMs = state.lockedUntil - now;
        return {
          blocked: true,
          remainingAttempts: 0
        };
      }
      // Bloqueo expirado, reiniciar
      state.count = 1;
      state.firstAttempt = now;
      state.lockedUntil = null;
    } else {
      state.count++;
    }
    state.lastAttempt = now;

    const remaining = FAILED_LOGIN_THRESHOLD - state.count;

    // ALERTA: Umbral de intentos fallidos alcanzado
    if (state.count >= FAILED_LOGIN_THRESHOLD && !state.lockedUntil) {
      state.lockedUntil = now + LOCKOUT_DURATION;

      await SecurityAlertService.trigger({
        type: 'failed_logins',
        severity: 'high',
        message: `Cuenta bloqueada temporalmente: ${FAILED_LOGIN_THRESHOLD} intentos fallidos de login para "${identifier}"`,
        details: {
          identifier,
          ip,
          attemptCount: state.count,
          windowMinutes: FAILED_LOGIN_WINDOW / 60000,
          lockoutMinutes: LOCKOUT_DURATION / 60000
        },
        ip,
        channels: ['sse', 'push', 'whatsapp', 'notification', 'audit']
      });

      return { blocked: true, remainingAttempts: 0 };
    }

    // Alerta preventiva cuando se acerca al umbral
    if (state.count >= Math.floor(FAILED_LOGIN_THRESHOLD / 2)) {
      await SecurityAlertService.trigger({
        type: 'failed_logins',
        severity: state.count >= FAILED_LOGIN_THRESHOLD - 1 ? 'high' : 'medium',
        message: `Múltiples intentos fallidos de login (${state.count}/${FAILED_LOGIN_THRESHOLD}) para "${identifier}"`,
        details: {
          identifier,
          ip,
          attemptCount: state.count,
          threshold: FAILED_LOGIN_THRESHOLD,
          remaining
        },
        ip,
        channels: ['audit']
      });
    }

    return { blocked: false, remainingAttempts: Math.max(0, remaining) };
  }

  /**
   * Alerta sobre cambios en permisos o roles.
   */
  static async alertPermissionChange(params: {
    action: 'create' | 'update' | 'delete' | 'role_change';
    targetType: 'permission' | 'role' | 'user_role';
    targetId?: string;
    targetName?: string;
    changedBy: string | number;
    changedByName?: string;
    details?: Record<string, unknown>;
  }) {
    const {
      action,
      targetType,
      targetId,
      targetName,
      changedBy,
      changedByName,
      details: extraDetails
    } = params;
    const actionLabel =
      action === 'create'
        ? 'creado'
        : action === 'update'
          ? 'modificado'
          : action === 'delete'
            ? 'eliminado'
            : 'cambiado';
    const typeLabel =
      targetType === 'permission' ? 'Permiso' : targetType === 'role' ? 'Rol' : 'Rol de usuario';

    await SecurityAlertService.trigger({
      type: 'permission_change',
      severity: 'high',
      message: `${typeLabel} ${actionLabel}: ${targetName || targetId || 'N/A'} por ${changedByName || changedBy}`,
      details: {
        action,
        targetType,
        targetId,
        targetName,
        changedBy,
        changedByName,
        ...extraDetails
      },
      userId: changedBy,
      channels: ['sse', 'push', 'notification', 'audit']
    });
  }

  /**
   * Alerta sobre operaciones masivas o sospechosas (anulaciones).
   */
  static async checkMassAnulation(params: {
    entityType: 'venta' | 'servicio' | 'cuenta';
    entityId: string;
    entityCode: string;
    userId: string | number;
    userName?: string;
    totalAmount: number;
  }) {
    const { entityType, entityCode, userId, userName, totalAmount } = params;
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutos
    const threshold = 3; // 3+ anulaciones = alerta

    // Usar clave temporal para tracking de anulaciones por usuario
    const anulationKey = `anulation:${userId}`;
    const store = (globalThis as any).__anulationStore as
      Map<string, { count: number; firstAt: number; entities: string[] }> | undefined;
    if (!(globalThis as any).__anulationStore) {
      (globalThis as any).__anulationStore = new Map();
    }
    const anulationStore = (globalThis as any).__anulationStore as Map<
      string,
      { count: number; firstAt: number; entities: string[] }
    >;

    let entry = anulationStore.get(anulationKey);
    if (!entry || now - entry.firstAt > windowMs) {
      entry = { count: 1, firstAt: now, entities: [entityCode] };
      anulationStore.set(anulationKey, entry);
      return;
    }

    entry.count++;
    entry.entities.push(entityCode);

    if (entry.count >= threshold) {
      // Limpiar para evitar alertas duplicadas
      anulationStore.delete(anulationKey);

      await SecurityAlertService.trigger({
        type: 'mass_anulation',
        severity: 'critical',
        message: `⚠️ ANULACIONES MÚLTIPLES: ${entry.count} anulaciones de ${entityType} en menos de 5 minutos por ${userName || userId}`,
        details: {
          entityType,
          count: entry.count,
          entities: entry.entities,
          userId,
          userName,
          totalAmount,
          windowMinutes: windowMs / 60000
        },
        userId,
        channels: ['sse', 'push', 'whatsapp', 'notification', 'audit']
      });
    } else if (entry.count >= threshold - 1) {
      // Alerta preventiva
      await SecurityAlertService.trigger({
        type: 'mass_anulation',
        severity: 'high',
        message: `Múltiples anulaciones (${entry.count}/${threshold}) de ${entityType} por ${userName || userId}`,
        details: {
          entityType,
          count: entry.count,
          entities: entry.entities,
          userId,
          userName,
          windowMinutes: windowMs / 60000
        },
        userId,
        channels: ['sse', 'push', 'notification', 'audit']
      });
    }
  }

  /**
   * Alerta sobre actividad sospechosa general.
   */
  static async alertSuspicious(params: {
    message: string;
    details: Record<string, unknown>;
    userId?: string | number;
    ip?: string;
    severity?: AlertSeverity;
  }) {
    await SecurityAlertService.trigger({
      type: 'suspicious_activity',
      severity: params.severity || 'medium',
      message: params.message,
      details: params.details,
      userId: params.userId,
      ip: params.ip,
      channels: ['sse', 'push', 'whatsapp', 'notification', 'audit']
    });
  }

  // ─── Método principal de alerta ──────────────────────────────

  static async trigger(alert: SecurityAlert) {
    const channels = alert.channels || ['sse', 'notification', 'audit'];
    const timestamp = getNowInBusinessTimezone();

    // 1. Audit log (siempre)
    if (channels.includes('audit')) {
      try {
        await AuditRepository.log({
          user_id: alert.userId,
          action: `SECURITY_ALERT:${alert.type}`,
          resource_type: 'security',
          details: {
            severity: alert.severity,
            message: alert.message,
            ...alert.details
          },
          ip_address: alert.ip
        });
      } catch (err) {
        logger.error('[SecurityAlert] Error en audit log:', err);
      }
    }

    // 2. Notificación in-app (para admins y cajeros)
    if (channels.includes('notification')) {
      try {
        // Notificar a todos los administradores
        const adminUsers = await query<any[]>(
          `SELECT u.id_usuario FROM usuarios u
           INNER JOIN roles r ON u.rol_id = r.id_rol
           WHERE LOWER(r.nombre) = 'administrador' AND u.estado = 1`
        );

        for (const admin of adminUsers) {
          await NotificationService.create({
            usuario_id: admin.id_usuario,
            tipo: `security_alert_${alert.severity}`,
            titulo: `🔒 ${alertSeverityLabel(alert.severity)}: ${alertTypeLabel(alert.type)}`,
            mensaje: alert.message,
            estado: 1,
            data: JSON.stringify({
              type: alert.type,
              severity: alert.severity,
              details: alert.details,
              timestamp
            })
          });
        }
      } catch (err) {
        logger.error('[SecurityAlert] Error en notification:', err);
      }
    }

    // 3. SSE (broadcast en tiempo real al dashboard)
    if (channels.includes('sse')) {
      try {
        sendNotificationToAll('security_alert', {
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          details: alert.details,
          timestamp
        });
      } catch (err) {
        logger.error('[SecurityAlert] Error en SSE:', err);
      }
    }

    // 4. Push notifications (para severidades altas/críticas)
    if (channels.includes('push') && (alert.severity === 'high' || alert.severity === 'critical')) {
      try {
        const pushTitle = `🔒 ${alertSeverityLabel(alert.severity)}: ${alertTypeLabel(alert.type)}`;
        const pushBody = alert.message.substring(0, 100);

        await sendPushByRole('administrador', pushTitle, pushBody, {
          type: 'security_alert',
          alertType: alert.type,
          severity: alert.severity,
          timestamp
        });
        await sendPushByRole('cajero', pushTitle, pushBody, {
          type: 'security_alert',
          alertType: alert.type,
          severity: alert.severity,
          timestamp
        });
      } catch (err) {
        logger.error('[SecurityAlert] Error en push:', err);
      }
    }

    // 5. WhatsApp (SOLO para críticos)
    if (channels.includes('whatsapp') && alert.severity === 'critical') {
      try {
        const adminWhatsApp = await getAdminWhatsApp();
        if (adminWhatsApp) {
          const whatsappMessage = `🔴 *ALERTA DE SEGURIDAD CRÍTICA*\n\n*Tipo:* ${alertTypeLabel(alert.type)}\n*Mensaje:* ${alert.message}\n*Hora:* ${timestamp}\n\nPor favor revisa el dashboard para más detalles.`;
          await enviarWhatsApp(adminWhatsApp, whatsappMessage);
        }
      } catch (err) {
        logger.error('[SecurityAlert] Error en WhatsApp:', err);
      }
    }

    // Log interno
    logger.warn(`[SecurityAlert] ${alertSeverityLabel(alert.severity)}: ${alert.message}`, {
      type: alert.type,
      severity: alert.severity,
      ...alert.details
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────

function alertSeverityLabel(severity: AlertSeverity): string {
  switch (severity) {
    case 'low':
      return '🔵 Informativo';
    case 'medium':
      return '🟡 Precaución';
    case 'high':
      return '🟠 Advertencia';
    case 'critical':
      return '🔴 CRÍTICO';
  }
}

function alertTypeLabel(type: AlertType): string {
  switch (type) {
    case 'failed_logins':
      return 'Intentos de login fallidos';
    case 'permission_change':
      return 'Cambio de permisos';
    case 'mass_anulation':
      return 'Anulaciones múltiples';
    case 'suspicious_activity':
      return 'Actividad sospechosa';
    case 'role_change':
      return 'Cambio de rol';
    case 'password_reset':
      return 'Reseteo de contraseña';
    case 'mass_operation':
      return 'Operación masiva';
  }
}

export default SecurityAlertService;
