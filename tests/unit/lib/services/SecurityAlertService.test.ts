import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.hoisted(() => {
  (globalThis as any).setInterval = () => ({ unref: () => {} });
});

vi.mock('@/lib/database/db', () => ({
  query: vi.fn(),
  generateUUID: vi.fn(() => 'uuid-1')
}));

vi.mock('@/lib/business/timezoneService', () => ({
  getNowInBusinessTimezone: vi.fn(() => '2026-01-15 10:00:00')
}));

vi.mock('@/lib/api/sseService', () => ({
  sendNotificationToAll: vi.fn()
}));

vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: vi.fn()
}));

vi.mock('@/modules/comunicaciones/whatsapp/adaptador', () => ({
  enviarWhatsApp: vi.fn()
}));

vi.mock('@/lib/business/whatsappConfig', () => ({
  getAdminWhatsApp: vi.fn()
}));

vi.mock('@/modules/auditoria/registro/repositorio', () => ({
  AuditRepository: {
    log: vi.fn()
  }
}));

vi.mock('@/modules/comunicaciones/notificaciones/servicio', () => ({
  NotificationService: {
    create: vi.fn()
  }
}));

vi.mock('@/lib/utils/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  }
}));

import { SecurityAlertService } from '@/modules/auditoria/alertas/servicio';
import { query } from '@/lib/database/db';
import { sendNotificationToAll } from '@/lib/api/sseService';
import { sendPushByRole } from '@/modules/comunicaciones';
import { enviarWhatsApp } from '@/modules/comunicaciones/whatsapp/adaptador';
import { getAdminWhatsApp } from '@/lib/business/whatsappConfig';
import { AuditRepository } from '@/modules/auditoria/registro/repositorio';
import { NotificationService } from '@/modules/comunicaciones/notificaciones/servicio';
import { AnulationCounter } from '@/modules/auditoria/alertas/contador';

beforeEach(() => {
  vi.clearAllMocks();
  AnulationCounter.clearMemory();
  vi.mocked(query).mockResolvedValue([] as any);
  vi.mocked(getAdminWhatsApp).mockResolvedValue('+56911111111');
});

afterEach(() => {
  AnulationCounter.clearMemory();
});

describe('SecurityAlertService.checkFailedLogin', () => {
  it('primer intento fallido no bloquea y queda 4 restantes', async () => {
    const result = await SecurityAlertService.checkFailedLogin('user-a@test.cl', '1.1.1.1');

    expect(result).toEqual({ blocked: false, remainingAttempts: 4 });
  });

  it('al 5° intento bloquea la cuenta y dispara alerta de auditoría', async () => {
    const id = `lock-${Date.now()}-1`;
    for (let i = 0; i < 4; i++) {
      const r = await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');
      expect(r.blocked).toBe(false);
    }

    const locked = await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');

    expect(locked).toEqual({ blocked: true, remainingAttempts: 0 });
    expect(AuditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SECURITY_ALERT:failed_logins',
        resource_type: 'security'
      })
    );
    expect(sendNotificationToAll).toHaveBeenCalledWith(
      'security_alert',
      expect.objectContaining({ severity: 'high', type: 'failed_logins' })
    );
  });

  it('mientras está bloqueado sigue reportando blocked', async () => {
    const id = `lock-${Date.now()}-2`;
    for (let i = 0; i < 5; i++) {
      await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');
    }

    const again = await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');

    expect(again.blocked).toBe(true);
    expect(again.remainingAttempts).toBe(0);
  });

  it('alerta preventiva al alcanzar la mitad del umbral (3/5)', async () => {
    const id = `warn-${Date.now()}`;
    await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');
    await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');

    const third = await SecurityAlertService.checkFailedLogin(id, '1.1.1.1');

    expect(third.blocked).toBe(false);
    expect(third.remainingAttempts).toBe(2);
    expect(AuditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SECURITY_ALERT:failed_logins' })
    );
  });

  it('identificadores distintos tienen contadores independientes', async () => {
    const a = `iso-a-${Date.now()}`;
    const b = `iso-b-${Date.now()}`;
    for (let i = 0; i < 5; i++) {
      await SecurityAlertService.checkFailedLogin(a, '1.1.1.1');
    }

    const other = await SecurityAlertService.checkFailedLogin(b, '1.1.1.1');

    expect(other.blocked).toBe(false);
    expect(other.remainingAttempts).toBe(4);
  });
});

describe('SecurityAlertService.alertPermissionChange', () => {
  it('registra auditoría y notifica a admins en cambios de permiso', async () => {
    vi.mocked(query).mockResolvedValue([{ id_usuario: 'admin-1' }] as any);

    await SecurityAlertService.alertPermissionChange({
      action: 'update',
      targetType: 'permission',
      targetId: 'perm-1',
      targetName: 'ventas.create',
      changedBy: 'admin-9',
      changedByName: 'Admin'
    });

    expect(AuditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SECURITY_ALERT:permission_change',
        resource_type: 'security'
      })
    );
    expect(NotificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 'admin-1',
        tipo: 'security_alert_high',
        estado: 1
      })
    );
    expect(sendNotificationToAll).toHaveBeenCalledWith(
      'security_alert',
      expect.objectContaining({ type: 'permission_change', severity: 'high' })
    );
    expect(sendPushByRole).toHaveBeenCalledWith(
      'administrador',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ alertType: 'permission_change' })
    );
  });

  it('describe creación de rol de usuario en el mensaje', async () => {
    vi.mocked(query).mockResolvedValue([] as any);

    await SecurityAlertService.alertPermissionChange({
      action: 'role_change',
      targetType: 'user_role',
      targetId: 'user-5',
      changedBy: 1
    });

    expect(sendNotificationToAll).toHaveBeenCalledWith(
      'security_alert',
      expect.objectContaining({
        type: 'permission_change',
        message: expect.stringContaining('Rol de usuario')
      })
    );
  });
});

describe('SecurityAlertService.checkMassAnulation', () => {
  const base = {
    entityType: 'venta' as const,
    entityId: 'venta-1',
    entityCode: 'V-001',
    userId: 'user-anim',
    userName: 'Animadora',
    totalAmount: 50000
  };

  it('la primera anulación en ventana no alerta', async () => {
    await SecurityAlertService.checkMassAnulation(base);

    expect(AuditRepository.log).not.toHaveBeenCalled();
  });

  it('alerta preventiva a las 2 anulaciones (2/3)', async () => {
    await SecurityAlertService.checkMassAnulation({ ...base, entityId: 'v1', entityCode: 'V1' });
    await SecurityAlertService.checkMassAnulation({ ...base, entityId: 'v2', entityCode: 'V2' });

    expect(AuditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SECURITY_ALERT:mass_anulation' })
    );
    expect(sendNotificationToAll).toHaveBeenCalledWith(
      'security_alert',
      expect.objectContaining({ severity: 'high' })
    );
  });

  it('alerta crítica a las 3 anulaciones y limpia el contador', async () => {
    await SecurityAlertService.checkMassAnulation({ ...base, entityId: 'v1', entityCode: 'V1' });
    await SecurityAlertService.checkMassAnulation({ ...base, entityId: 'v2', entityCode: 'V2' });
    vi.mocked(AuditRepository.log).mockClear();
    vi.mocked(sendNotificationToAll).mockClear();
    vi.mocked(enviarWhatsApp).mockClear();
    vi.mocked(getAdminWhatsApp).mockResolvedValue('+56911111111');

    await SecurityAlertService.checkMassAnulation({ ...base, entityId: 'v3', entityCode: 'V3' });

    expect(AuditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SECURITY_ALERT:mass_anulation',
        details: expect.objectContaining({ severity: 'critical' })
      })
    );
    expect(enviarWhatsApp).toHaveBeenCalledWith(
      '+56911111111',
      expect.stringContaining('ALERTA DE SEGURIDAD CRÍTICA')
    );

    // contador limpio: una nueva no vuelve a disparar de inmediato
    vi.mocked(AuditRepository.log).mockClear();
    await SecurityAlertService.checkMassAnulation({ ...base, entityId: 'v4', entityCode: 'V4' });
    expect(AuditRepository.log).not.toHaveBeenCalled();
  });
});

describe('SecurityAlertService.alertSuspicious', () => {
  it('usa severity medium por defecto y canales completos', async () => {
    vi.mocked(query).mockResolvedValue([] as any);

    await SecurityAlertService.alertSuspicious({
      message: 'Acceso raro',
      details: { path: '/admin' },
      userId: 'u1',
      ip: '9.9.9.9'
    });

    expect(AuditRepository.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'SECURITY_ALERT:suspicious_activity',
        ip_address: '9.9.9.9'
      })
    );
    expect(sendNotificationToAll).toHaveBeenCalledWith(
      'security_alert',
      expect.objectContaining({ severity: 'medium', type: 'suspicious_activity' })
    );
    // push solo high/critical
    expect(sendPushByRole).not.toHaveBeenCalled();
    // whatsapp solo critical
    expect(enviarWhatsApp).not.toHaveBeenCalled();
  });

  it('permite severity custom high y activa push', async () => {
    vi.mocked(query).mockResolvedValue([] as any);

    await SecurityAlertService.alertSuspicious({
      message: 'Patrón sospechoso',
      details: {},
      severity: 'high'
    });

    expect(sendPushByRole).toHaveBeenCalledWith(
      'administrador',
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ severity: 'high' })
    );
    expect(enviarWhatsApp).not.toHaveBeenCalled();
  });
});

describe('SecurityAlertService.trigger', () => {
  it('siempre escribe audit y omite canales no pedidos', async () => {
    await SecurityAlertService.trigger({
      type: 'role_change',
      severity: 'low',
      message: 'Cambio de rol',
      details: {},
      channels: ['audit']
    });

    expect(AuditRepository.log).toHaveBeenCalledTimes(1);
    expect(sendNotificationToAll).not.toHaveBeenCalled();
    expect(NotificationService.create).not.toHaveBeenCalled();
    expect(sendPushByRole).not.toHaveBeenCalled();
    expect(enviarWhatsApp).not.toHaveBeenCalled();
  });

  it('no lanza si falla el audit log', async () => {
    vi.mocked(AuditRepository.log).mockRejectedValue(new Error('audit down'));

    await expect(
      SecurityAlertService.trigger({
        type: 'password_reset',
        severity: 'medium',
        message: 'Reset',
        details: {},
        channels: ['audit', 'sse']
      })
    ).resolves.toBeUndefined();

    expect(sendNotificationToAll).toHaveBeenCalled();
  });

  it('canales por defecto son sse, notification y audit', async () => {
    vi.mocked(query).mockResolvedValue([] as any);

    await SecurityAlertService.trigger({
      type: 'mass_operation',
      severity: 'medium',
      message: 'Operación masiva',
      details: {}
    });

    expect(AuditRepository.log).toHaveBeenCalled();
    expect(sendNotificationToAll).toHaveBeenCalled();
    expect(sendPushByRole).not.toHaveBeenCalled();
    expect(enviarWhatsApp).not.toHaveBeenCalled();
  });
});
