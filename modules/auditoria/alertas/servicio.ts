import { query, generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/modules/comunicaciones';
import { enviarWhatsApp } from '@/modules/comunicaciones';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { AuditService } from '@/modules/auditoria/registro/servicio';
import { NotificationService } from '@/modules/comunicaciones';
import { logger } from '@/lib/utils/logger';
import { FAILED_LOGIN, FailedLoginStore } from '@/lib/cache/failedLoginStore';
import {
  ANULATION_THRESHOLD,
  ANULATION_WINDOW_MS,
  AnulationCounter
} from '@/modules/auditoria/alertas/contador';

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

// ─── Servicio ─────────────────────────────────────────────────────

export class SecurityAlertService {
  /**
   * Registra un intento fallido de login, bloquea la cuenta al alcanzar el umbral y
   * alerta. El conteo es compartido entre instancias (Redis) con respaldo en memoria.
   */
  static async checkFailedLogin(
    identifier: string,
    ip: string
  ): Promise<{ blocked: boolean; remainingAttempts: number }> {
    const attempt = await FailedLoginStore.register(identifier);

    // ALERTA: umbral de intentos fallidos alcanzado. Se emite una sola vez por bloqueo.
    if (attempt.justLocked) {
      await SecurityAlertService.trigger({
        type: 'failed_logins',
        severity: 'high',
        message: `Cuenta bloqueada temporalmente: ${FAILED_LOGIN.threshold} intentos fallidos de login para "${identifier}"`,
        details: {
          identifier,
          ip,
          attemptCount: attempt.count,
          windowMinutes: FAILED_LOGIN.windowMs / 60000,
          lockoutMinutes: FAILED_LOGIN.lockoutMs / 60000
        },
        ip,
        channels: ['sse', 'push', 'whatsapp', 'notification', 'audit']
      });

      return { blocked: true, remainingAttempts: 0 };
    }

    // Alerta preventiva cuando se acerca al umbral
    if (!attempt.blocked && attempt.count >= Math.floor(FAILED_LOGIN.threshold / 2)) {
      await SecurityAlertService.trigger({
        type: 'failed_logins',
        severity: attempt.count >= FAILED_LOGIN.threshold - 1 ? 'high' : 'medium',
        message: `Múltiples intentos fallidos de login (${attempt.count}/${FAILED_LOGIN.threshold}) para "${identifier}"`,
        details: {
          identifier,
          ip,
          attemptCount: attempt.count,
          threshold: FAILED_LOGIN.threshold,
          remaining: attempt.remainingAttempts
        },
        ip,
        channels: ['audit']
      });
    }

    return { blocked: attempt.blocked, remainingAttempts: attempt.remainingAttempts };
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
   * Alerta sobre operaciones masivas o sospechosas (anulaciones). El conteo por usuario
   * es compartido entre instancias (Redis) con respaldo en memoria, así que el umbral no
   * depende del proceso que atendió cada anulación.
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

    const { count, items, triggered } = await AnulationCounter.register(String(userId), entityCode);

    // ALERTA crítica: umbral alcanzado. El contador ya quedó limpio, así que la próxima
    // anulación abre una ventana nueva en lugar de repetir la alerta.
    if (triggered) {
      await SecurityAlertService.trigger({
        type: 'mass_anulation',
        severity: 'critical',
        message: `⚠️ ANULACIONES MÚLTIPLES: ${count} anulaciones de ${entityType} en menos de ${ANULATION_WINDOW_MS / 60000} minutos por ${userName || userId}`,
        details: {
          entityType,
          count,
          entities: items,
          userId,
          userName,
          totalAmount,
          windowMinutes: ANULATION_WINDOW_MS / 60000
        },
        userId,
        channels: ['sse', 'push', 'whatsapp', 'notification', 'audit']
      });
    } else if (count >= ANULATION_THRESHOLD - 1) {
      // Alerta preventiva
      await SecurityAlertService.trigger({
        type: 'mass_anulation',
        severity: 'high',
        message: `Múltiples anulaciones (${count}/${ANULATION_THRESHOLD}) de ${entityType} por ${userName || userId}`,
        details: {
          entityType,
          count,
          entities: items,
          userId,
          userName,
          windowMinutes: ANULATION_WINDOW_MS / 60000
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
        await AuditService.log({
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
