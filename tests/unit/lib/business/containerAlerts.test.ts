import { beforeEach, describe, expect, it, vi } from 'vitest';

const consulta = vi.hoisted(() => vi.fn());
const emitir = vi.hoisted(() => vi.fn());
const crearNotificacion = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());
const capturar = vi.hoisted(() => vi.fn());

vi.mock('@/lib/database/db', () => ({ query: consulta }));
vi.mock('@/lib/api/sseService', () => ({ sendNotificationToAll: emitir }));
vi.mock('@/modules/comunicaciones/notificaciones/servicio', () => ({
  NotificationService: { create: crearNotificacion }
}));
vi.mock('@/modules/comunicaciones/push/servicio', () => ({
  sendPushByRole: push,
  sendPushToUser: vi.fn()
}));
vi.mock('@/lib/business/timezoneService', () => ({
  getSystemTimezone: () => 'America/Santiago',
  getNowInBusinessTimezone: () => '2026-09-25 12:00:00'
}));
vi.mock('@/lib/utils/logger', () => ({ default: { captureException: capturar } }));

import {
  checkWarehouseContainerAlerts,
  getContainerReturnsSummary,
  HORAS_ENVASE_SIN_CONFIRMAR,
  WAREHOUSE_CONTAINER_ALERT_TIPO
} from '@/lib/business/containerAlerts';

/** Contadores que devolverá el siguiente chequeo. */
let pendientes = 0;
let vencidos = 0;

describe('alerta de envases entregados sin recibir', () => {
  beforeEach(() => {
    consulta.mockReset();
    emitir.mockReset();
    crearNotificacion.mockReset();
    push.mockReset();
    capturar.mockReset();
    // El estado del último aviso vive en globalThis, como en check-timers.
    delete (globalThis as { __warehouseContainerAlert?: number }).__warehouseContainerAlert;

    consulta.mockImplementation(async (sql: string) => {
      if (sql.includes('COUNT(*)')) return [{ pendientes, vencidos }];
      return [{ id_usuario: 'u-almacen' }];
    });
    pendientes = 0;
    vencidos = 0;
  });

  it('cuenta solo los entregados sin recepción y usa la hora del negocio con umbral de 2 horas', async () => {
    pendientes = 4;
    vencidos = 1;

    const resumen = await getContainerReturnsSummary();

    expect(resumen).toEqual({ pendientes: 4, vencidos: 1 });
    const [sql, params] = consulta.mock.calls[0];
    // La hora naive que escribe la app es la misma con la que se compara.
    expect(params).toEqual(['2026-09-25 12:00:00']);
    expect(sql).toContain(`interval '${HORAS_ENVASE_SIN_CONFIRMAR} hours'`);
    expect(sql).toContain('u.fecha_confirmacion IS NULL');
    expect(sql).toContain('u.fecha_devolucion IS NOT NULL');
  });

  it('primer chequeo en cero: solo publica el estado limpio, sin campana ni push', async () => {
    const resumen = await checkWarehouseContainerAlerts();

    expect(resumen).toEqual({ pendientes: 0, vencidos: 0 });
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(emitir).toHaveBeenCalledWith(
      WAREHOUSE_CONTAINER_ALERT_TIPO,
      expect.objectContaining({ pendientes: 0, vencidos: 0, umbral_horas: 2 })
    );
    expect(crearNotificacion).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
  });

  it('cuando un envase pasa de vencido: persiste la campana, emite y envía push al almacén', async () => {
    pendientes = 2;
    vencidos = 1;

    const resumen = await checkWarehouseContainerAlerts();

    expect(resumen).toEqual({ pendientes: 2, vencidos: 1 });
    expect(crearNotificacion).toHaveBeenCalledTimes(1);
    expect(crearNotificacion).toHaveBeenCalledWith(
      expect.objectContaining({
        usuario_id: 'u-almacen',
        tipo: WAREHOUSE_CONTAINER_ALERT_TIPO,
        titulo: 'Envases esperando recepción',
        mensaje: expect.stringContaining('1 envase')
      })
    );
    expect(emitir).toHaveBeenCalledWith(
      WAREHOUSE_CONTAINER_ALERT_TIPO,
      expect.objectContaining({ pendientes: 2, vencidos: 1 })
    );
    expect(push).toHaveBeenCalledWith(
      'administrador',
      'Envases esperando recepción',
      expect.any(String),
      { tipo: WAREHOUSE_CONTAINER_ALERT_TIPO }
    );
    expect(push).toHaveBeenCalledWith(
      'almacen',
      'Envases esperando recepción',
      expect.any(String),
      {
        tipo: WAREHOUSE_CONTAINER_ALERT_TIPO
      }
    );
  });

  it('el mismo número chequeado N veces solo avisa una vez', async () => {
    pendientes = 1;
    vencidos = 1;

    await checkWarehouseContainerAlerts();
    await checkWarehouseContainerAlerts();
    await checkWarehouseContainerAlerts();

    expect(emitir).toHaveBeenCalledTimes(1);
    expect(crearNotificacion).toHaveBeenCalledTimes(1);
  });

  it('un atraso mayor vuelve a avisar con el contador actualizado', async () => {
    pendientes = 3;
    vencidos = 1;
    await checkWarehouseContainerAlerts();

    vencidos = 3;
    pendientes = 4;
    await checkWarehouseContainerAlerts();

    expect(emitir).toHaveBeenCalledTimes(2);
    expect(crearNotificacion).toHaveBeenCalledTimes(2);
    expect(crearNotificacion.mock.calls[1][0].mensaje).toContain('3 envase');
  });

  it('cuando se confirman todos, publica el estado limpio sin nueva campana', async () => {
    pendientes = 2;
    vencidos = 2;
    await checkWarehouseContainerAlerts();

    pendientes = 0;
    vencidos = 0;
    const resumen = await checkWarehouseContainerAlerts();

    expect(resumen).toEqual({ pendientes: 0, vencidos: 0 });
    expect(emitir).toHaveBeenCalledTimes(2);
    expect(emitir.mock.calls[1][1]).toMatchObject({ vencidos: 0 });
    // La campana fue solo cuando el atraso creció.
    expect(crearNotificacion).toHaveBeenCalledTimes(1);
  });

  it('el tipo de campana y el evento emitido son el mismo nombre declarado', async () => {
    // El catálogo de sseEvents y la campana usan el mismo string: si alguien
    // cambia uno solo, aquí y en el test de completitud se nota.
    expect(WAREHOUSE_CONTAINER_ALERT_TIPO).toBe('warehouse_container_alert');

    pendientes = 1;
    vencidos = 1;
    await checkWarehouseContainerAlerts();

    expect(emitir).toHaveBeenCalledWith(WAREHOUSE_CONTAINER_ALERT_TIPO, expect.any(Object));
    expect(crearNotificacion.mock.calls[0][0].tipo).toBe(WAREHOUSE_CONTAINER_ALERT_TIPO);
  });

  it('un fallo de consulta no lanza ni emite: la petición que lo llamó sigue viva', async () => {
    consulta.mockImplementation(async () => {
      throw new Error('sin base');
    });

    const resumen = await checkWarehouseContainerAlerts();

    expect(resumen).toEqual({ pendientes: 0, vencidos: 0 });
    expect(emitir).not.toHaveBeenCalled();
    expect(crearNotificacion).not.toHaveBeenCalled();
    expect(capturar).toHaveBeenCalledTimes(1);
  });

  it('un fallo al crear la campana no corta el chequeo ni propaga', async () => {
    pendientes = 1;
    vencidos = 1;
    crearNotificacion.mockImplementation(async () => {
      throw new Error('sin campana');
    });

    await expect(checkWarehouseContainerAlerts()).resolves.toEqual({
      pendientes: 1,
      vencidos: 1
    });
    // El evento en vivo salió antes de intentar la campana.
    expect(emitir).toHaveBeenCalledTimes(1);
    expect(capturar).toHaveBeenCalledTimes(1);
    // Y el contador quedó registrado: el próximo chequeo no repite el aviso.
    await checkWarehouseContainerAlerts();
    expect(emitir).toHaveBeenCalledTimes(1);
  });
});
