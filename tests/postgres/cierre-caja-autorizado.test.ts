import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/integrations/pushNotifications', () => ({
  sendPushByRole: vi.fn(),
  sendPushToUser: vi.fn()
}));
vi.mock('@/lib/services/SecurityAlertService', () => ({
  SecurityAlertService: { checkMassAnulation: vi.fn().mockResolvedValue(undefined) }
}));
// El cierre avisa al administrador por WhatsApp: en un test eso no debe salir.
vi.mock('@/lib/integrations/whatsappService', () => ({
  enviarMensajeSolicitudCierreCaja: vi.fn().mockResolvedValue(true),
  enviarWhatsApp: vi.fn().mockResolvedValue(true),
  getAdminWhatsApp: () => '+56900000000'
}));

import db, { query } from '@/lib/database/db';
import { snapshotDatabase, restoreDatabase } from '@/lib/database/maintenance';
import { CashRegisterRepository } from '@/lib/repositories/CashRegisterRepository';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { reenviarAvisoCierreCaja, solicitarOProcesarCierreCaja } from '@/lib/api/cierreCaja';
import { WithdrawalService } from '@/lib/services/WithdrawalService';
import { buildCajaDetailsNumbers } from '@/components/caja/details/cajaDetailsModel';
import { reavisarCierresPendientes } from '@/lib/business/cierreCajaRecordatorios';
import { enviarMensajeSolicitudCierreCaja } from '@/lib/integrations/whatsappService';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * Cierre de caja con autorización del administrador.
 *
 * Antes, `PATCH /api/cashregister` cerraba la caja con lo que mandara el cajero. Ahora
 * el cajero **pide** el cierre (la caja sigue abierta hasta que el administrador
 * responda el link del WhatsApp) y al cerrar se descuentan del efectivo los saldos
 * prepago que los clientes todavía tienen cargados, porque ese dinero se cobró en un
 * turno anterior y no está en el cajón.
 */

const MONTO_ESPERADO = 100000 + 50000 + 20000 + 5000 - 3000; // 172.000

const limpiarCajas = async () => {
  await query('UPDATE cajas SET estado = 0 WHERE estado = 1');
  await query("DELETE FROM solicitudes_cierre_caja WHERE estado = 'pendiente'");
};

const abrirCaja = async () => {
  await limpiarCajas();
  const [user] = await query('SELECT id_usuario FROM usuarios LIMIT 1');
  const idCaja = crypto.randomUUID();
  await query(
    `INSERT INTO cajas (id_caja, fecha_apertura, usuario_id_apertura, monto_apertura, monto_cierre,
         efectivo, tarjeta, transferencia, devolucion, venta, cargo_tarjeta, estado)
       VALUES (?, now(), ?, 100000, 0, 50000, 20000, 5000, 3000, 0, 0, 1)`,
    [idCaja, user.id_usuario]
  );
  return { idCaja, userId: user.id_usuario as string };
};

const crearClienteConSaldo = async (saldo: number) => {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO clientes (id_cliente, nombre, apellido, fecha_crea, estado, saldo)
     VALUES (?, 'Cliente', 'Prepago', now(), 1, ?)`,
    [id, saldo]
  );
  return id;
};

const cajero = { id: 'user-cajero', role: 'cajero', nick: 'CajeroTest' };

it('el cajero pide el cierre: la solicitud queda pendiente y la caja sigue abierta', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const saldoInicialClientes = await CashRegisterRepository.saldosPendientesClientes();
    const { idCaja } = await abrirCaja();
    await crearClienteConSaldo(12000);
    const saldoTotalClientes = saldoInicialClientes + 12000;

    const resultado = await solicitarOProcesarCierreCaja({ user: cajero, id_caja: idCaja });

    expect(resultado.estado).toBe('pendiente');
    expect(resultado.montoCierre).toBe(MONTO_ESPERADO - saldoTotalClientes);
    expect(resultado.saldoClientesDescontado).toBe(saldoTotalClientes);
    expect(enviarMensajeSolicitudCierreCaja).toHaveBeenCalledOnce();

    const [caja] = await query(
      'SELECT estado, monto_cierre, cierre_solicitado_en FROM cajas WHERE id_caja = ?',
      [idCaja]
    );
    expect(Number(caja.estado)).toBe(1); // sigue abierta
    expect(Number(caja.monto_cierre)).toBe(0);
    expect(caja.cierre_solicitado_en).not.toBeNull();

    const [solicitud] = await query(
      'SELECT estado, monto_cierre_calculado, saldo_clientes_descontado FROM solicitudes_cierre_caja WHERE caja_id = ?',
      [idCaja]
    );
    expect(solicitud.estado).toBe('pendiente');
    expect(Number(solicitud.monto_cierre_calculado)).toBe(MONTO_ESPERADO - saldoTotalClientes);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('el administrador cierra en el acto, sin mandar nada por WhatsApp', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const saldoInicialClientes = await CashRegisterRepository.saldosPendientesClientes();
    const { idCaja, userId } = await abrirCaja();
    await crearClienteConSaldo(12000);
    const saldoTotalClientes = saldoInicialClientes + 12000;

    const resultado = await solicitarOProcesarCierreCaja({
      user: { id: userId, role: 'administrador', nick: 'Admin' },
      id_caja: idCaja
    });

    expect(resultado.estado).toBe('cerrada');
    expect(enviarMensajeSolicitudCierreCaja).not.toHaveBeenCalled();

    const [caja] = await query(
      'SELECT estado, monto_cierre, saldo_clientes_descontado FROM cajas WHERE id_caja = ?',
      [idCaja]
    );
    expect(Number(caja.estado)).toBe(0);
    expect(Number(caja.monto_cierre)).toBe(MONTO_ESPERADO - saldoTotalClientes);
    expect(Number(caja.saldo_clientes_descontado)).toBe(saldoTotalClientes);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('autorizar el cierre cierra la caja descontando los saldos de clientes', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const saldoInicialClientes = await CashRegisterRepository.saldosPendientesClientes();
    const { idCaja } = await abrirCaja();
    await crearClienteConSaldo(12000);
    const saldoTotalClientes = saldoInicialClientes + 12000;

    const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
      nombre: 'CajeroTest'
    });
    const resultado = await CashRegisterRepository.procesarSolicitudCierre(
      solicitud.token,
      'confirmar',
      { nombre: 'Admin' }
    );

    expect(resultado.estado).toBe('aprobada');
    expect(resultado.saldo_clientes_descontado).toBe(saldoTotalClientes);

    const [caja] = await query(
      'SELECT estado, monto_cierre, saldo_clientes_descontado, cierre_solicitado_en FROM cajas WHERE id_caja = ?',
      [idCaja]
    );
    expect(Number(caja.estado)).toBe(0);
    expect(Number(caja.monto_cierre)).toBe(MONTO_ESPERADO - saldoTotalClientes);
    expect(Number(caja.saldo_clientes_descontado)).toBe(saldoTotalClientes);
    expect(caja.cierre_solicitado_en).toBeNull();

    const [sol] = await query(
      'SELECT estado, resuelto_por FROM solicitudes_cierre_caja WHERE caja_id = ?',
      [idCaja]
    );
    expect(sol.estado).toBe('aprobada');
    expect(sol.resuelto_por).toBe('Admin');
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('el descuento se recalcula al autorizar, no se arrastra desde la solicitud', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const saldoInicialClientes = await CashRegisterRepository.saldosPendientesClientes();
    const { idCaja } = await abrirCaja();
    await crearClienteConSaldo(12000);

    const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
      nombre: 'CajeroTest'
    });
    // Entre el pedido y la autorización otro turno cargó prepago: lo que importa es
    // lo que los clientes tienen cargado **al cerrar**.
    await crearClienteConSaldo(5000);

    const resultado = await CashRegisterRepository.procesarSolicitudCierre(
      solicitud.token,
      'confirmar',
      { nombre: 'Admin' }
    );

    const saldoTotalClientes = saldoInicialClientes + 17000;
    expect(resultado.saldo_clientes_descontado).toBe(saldoTotalClientes);
    const [caja] = await query('SELECT monto_cierre FROM cajas WHERE id_caja = ?', [idCaja]);
    expect(Number(caja.monto_cierre)).toBe(MONTO_ESPERADO - saldoTotalClientes);
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('el mismo token no cierra la caja dos veces', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { idCaja } = await abrirCaja();
    const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
      nombre: 'CajeroTest'
    });

    await CashRegisterRepository.procesarSolicitudCierre(solicitud.token, 'confirmar', {
      nombre: 'Admin'
    });

    await expect(
      CashRegisterRepository.procesarSolicitudCierre(solicitud.token, 'confirmar', {
        nombre: 'Admin'
      })
    ).rejects.toThrow();

    const [caja] = await query('SELECT fecha_cierre FROM cajas WHERE id_caja = ?', [idCaja]);
    expect(caja.fecha_cierre).not.toBeNull();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('rechazar el cierre deja la caja abierta y sin descuento aplicado', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { idCaja } = await abrirCaja();
    await crearClienteConSaldo(12000);

    const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
      nombre: 'CajeroTest'
    });
    const resultado = await CashRegisterRepository.procesarSolicitudCierre(
      solicitud.token,
      'rechazar',
      { nombre: 'Admin' }
    );

    expect(resultado.estado).toBe('rechazada');

    const [caja] = await query(
      'SELECT estado, monto_cierre, saldo_clientes_descontado, cierre_solicitado_en FROM cajas WHERE id_caja = ?',
      [idCaja]
    );
    expect(Number(caja.estado)).toBe(1);
    expect(Number(caja.monto_cierre)).toBe(0);
    expect(Number(caja.saldo_clientes_descontado)).toBe(0);
    expect(caja.cierre_solicitado_en).toBeNull();

    const [sol] = await query('SELECT estado FROM solicitudes_cierre_caja WHERE caja_id = ?', [
      idCaja
    ]);
    expect(sol.estado).toBe('rechazada');
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

it('no se puede pedir dos veces el cierre del mismo turno', async () => {
  const snapshot = await snapshotDatabase();
  try {
    const { idCaja } = await abrirCaja();
    await CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' });

    await expect(
      CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' })
    ).rejects.toThrow();
  } finally {
    await restoreDatabase(snapshot, 'test-only');
  }
});

// ── Lo que el dashboard pinta: la lista de cajas y el detalle del turno ─────────

// ── Reenviar el aviso de un cierre que quedó esperando ───────────────────────────

describe('reenviar el aviso de un cierre pendiente', () => {
  /**
   * Los timestamps de este flujo se escriben en hora de negocio, así que para "retroceder"
   * el último aviso hay que hacerlo con el mismo reloj, no con `now()` de la base.
   */
  const minutosAtrasEnHoraDeNegocio = (minutos: number) =>
    getNowInBusinessTimezone(new Date(Date.now() - minutos * 60_000));

  it('el primer aviso ya arranca el enfriamiento y queda como último aviso', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      await CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' });

      expect(await CashRegisterRepository.segundosParaReenviarAviso(idCaja)).toBeGreaterThan(0);

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.cierre_ultimo_aviso_en).not.toBeNull();
      expect(detalle?.cierre_ultimo_aviso_en).toBe(detalle?.cierre_solicitado_en);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('pasado el minuto reenvía la misma solicitud, sin crear otra ni cerrar la caja', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });
      vi.clearAllMocks();

      // El aviso salió hace cinco minutos y nadie respondió: eso es lo que habilita el reenvío.
      await query('UPDATE solicitudes_cierre_caja SET ultimo_aviso_en = ? WHERE caja_id = ?', [
        minutosAtrasEnHoraDeNegocio(5),
        idCaja
      ]);
      expect(await CashRegisterRepository.segundosParaReenviarAviso(idCaja)).toBe(0);

      const resultado = await reenviarAvisoCierreCaja({
        id_caja: idCaja,
        solicitante: 'CajeroTest'
      });

      expect(resultado.avisado).toBe(true);
      expect(resultado.httpStatus).toBe(200);
      expect(resultado.esperarSegundos).toBeGreaterThan(0);

      expect(enviarMensajeSolicitudCierreCaja).toHaveBeenCalledOnce();
      const enviado = (enviarMensajeSolicitudCierreCaja as any).mock.calls[0][0];
      expect(enviado.token).toBe(solicitud.token);
      expect(enviado.reenvio).toBe(true);

      // Sigue habiendo una sola solicitud, y la caja sigue abierta.
      const [fila] = await query(
        'SELECT COUNT(*)::int AS total FROM solicitudes_cierre_caja WHERE caja_id = ?',
        [idCaja]
      );
      expect(Number(fila.total)).toBe(1);

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.estado).toBe(1);
      expect(detalle?.cierre_pendiente).toBe(true);
      expect(detalle?.cierre_ultimo_aviso_en).toBe(resultado.ultimoAvisoEn);
      expect(await CashRegisterRepository.segundosParaReenviarAviso(idCaja)).toBeGreaterThan(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('el enfriamiento frena el segundo reenvío seguido', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      await CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' });
      await query('UPDATE solicitudes_cierre_caja SET ultimo_aviso_en = ? WHERE caja_id = ?', [
        minutosAtrasEnHoraDeNegocio(5),
        idCaja
      ]);
      vi.clearAllMocks();

      const primero = await reenviarAvisoCierreCaja({
        id_caja: idCaja,
        solicitante: 'CajeroTest'
      });
      const segundo = await reenviarAvisoCierreCaja({
        id_caja: idCaja,
        solicitante: 'CajeroTest'
      });

      expect(primero.avisado).toBe(true);
      expect(segundo.avisado).toBe(false);
      expect(segundo.httpStatus).toBe(429);
      expect(segundo.esperarSegundos).toBeGreaterThan(0);
      // Un solo WhatsApp: el segundo no salió.
      expect(enviarMensajeSolicitudCierreCaja).toHaveBeenCalledOnce();
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('resuelto el cierre ya no hay aviso que reenviar', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });
      await CashRegisterRepository.procesarSolicitudCierre(solicitud.token, 'rechazar', {
        nombre: 'Admin'
      });
      vi.clearAllMocks();

      expect(await CashRegisterRepository.segundosParaReenviarAviso(idCaja)).toBe(0);

      const resultado = await reenviarAvisoCierreCaja({
        id_caja: idCaja,
        solicitante: 'CajeroTest'
      });

      expect(resultado.avisado).toBe(false);
      expect(resultado.httpStatus).toBe(409);
      expect(enviarMensajeSolicitudCierreCaja).not.toHaveBeenCalled();
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});

// ── El cierre que nadie contestó: recordatorio automático y segundo pedido ──────

describe('un cierre que nadie contesta', () => {
  /** Igual que en el reenvío: para "retroceder" un sello hay que usar el reloj de negocio. */
  const minutosAtrasEnHoraDeNegocio = (minutos: number) =>
    getNowInBusinessTimezone(new Date(Date.now() - minutos * 60_000));

  it('recién pedido no es candidato al recordatorio ni al segundo pedido', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      await CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' });

      // El administrador está dentro del plazo: nadie tiene que insistir todavía.
      expect(await CashRegisterRepository.cierresPendientesParaRecordar()).toHaveLength(0);

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.cierre_pendiente).toBe(true);
      expect(detalle?.cierre_estancado).toBe(false);

      // Y pedirlo de nuevo se rechaza: ya hay una solicitud viva del mismo turno.
      await expect(
        CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' })
      ).rejects.toThrow(/esperando autorización/i);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('pasado el intervalo el recordatorio vuelve a avisar, sin crear otra solicitud', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });
      // El primer aviso salió hace 12 min (> AVISO_CIERRE_REINTENTO_MS = 10 min).
      await query('UPDATE solicitudes_cierre_caja SET ultimo_aviso_en = ? WHERE caja_id = ?', [
        minutosAtrasEnHoraDeNegocio(12),
        idCaja
      ]);
      vi.clearAllMocks();

      const candidatos = await CashRegisterRepository.cierresPendientesParaRecordar();
      expect(candidatos.map(c => c.caja_id)).toEqual([idCaja]);

      expect(await reavisarCierresPendientes()).toBe(1);

      expect(enviarMensajeSolicitudCierreCaja).toHaveBeenCalledOnce();
      const enviado = (enviarMensajeSolicitudCierreCaja as any).mock.calls[0][0];
      expect(enviado.token).toBe(solicitud.token);
      expect(enviado.reenvio).toBe(true);

      // Sigue siendo una sola solicitud y la caja sigue abierta.
      const [fila] = await query(
        'SELECT COUNT(*)::int AS total FROM solicitudes_cierre_caja WHERE caja_id = ?',
        [idCaja]
      );
      expect(Number(fila.total)).toBe(1);
      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.cierre_pendiente).toBe(true);
      expect(detalle?.estado).toBe(1);

      // El sello se movió: el próximo chequeo no vuelve a avisar enseguida.
      expect(await CashRegisterRepository.cierresPendientesParaRecordar()).toHaveLength(0);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('fuera de la ventana deja de insistir y el cajero puede pedir el cierre de nuevo', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      const primera = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });
      // 31 min: pasado el intervalo de recordatorio pero fuera de la ventana (30 min).
      await query(
        'UPDATE solicitudes_cierre_caja SET fecha_solicitud = ?, ultimo_aviso_en = ? WHERE caja_id = ?',
        [minutosAtrasEnHoraDeNegocio(31), minutosAtrasEnHoraDeNegocio(31), idCaja]
      );

      // Ya no insiste más; pasada la ventana la salida es pedirlo de nuevo.
      expect(await CashRegisterRepository.cierresPendientesParaRecordar()).toHaveLength(0);

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.cierre_pendiente).toBe(true);
      expect(detalle?.cierre_estancado).toBe(true);

      const segundo = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });
      expect(segundo.reemplazo).toBe(true);
      expect(segundo.token).not.toBe(primera.token);

      // La vieja quedó 'expirada' (nadie contestó) y la nueva es la pendiente.
      const [vieja] = await query(
        'SELECT estado, resuelto_por FROM solicitudes_cierre_caja WHERE token = ?',
        [primera.token]
      );
      expect(vieja.estado).toBe('expirada');
      expect(String(vieja.resuelto_por)).toContain('Sistema');

      const [nueva] = await query(
        "SELECT token FROM solicitudes_cierre_caja WHERE caja_id = ? AND estado = 'pendiente'",
        [idCaja]
      );
      expect(nueva.token).toBe(segundo.token);

      const [total] = await query(
        'SELECT COUNT(*)::int AS total FROM solicitudes_cierre_caja WHERE caja_id = ?',
        [idCaja]
      );
      expect(Number(total.total)).toBe(2);

      // La caja sigue abierta y el aviso "sin respuesta" desaparece con la solicitud nueva.
      const tras = await CashRegisterRepository.getById(idCaja);
      expect(tras?.estado).toBe(1);
      expect(tras?.cierre_pendiente).toBe(true);
      expect(tras?.cierre_estancado).toBe(false);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('una caja cerrada no se recuerda aunque la solicitud vieja siga pendiente', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      await CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' });
      await query(
        'UPDATE solicitudes_cierre_caja SET fecha_solicitud = ?, ultimo_aviso_en = ? WHERE caja_id = ?',
        [minutosAtrasEnHoraDeNegocio(12), minutosAtrasEnHoraDeNegocio(12), idCaja]
      );
      // La caja se cerró por fuera (otra vía) sin resolver la solicitud: no se avisa de una
      // caja que ya no está abierta.
      await query('UPDATE cajas SET estado = 0 WHERE id_caja = ?', [idCaja]);
      vi.clearAllMocks();

      expect(await CashRegisterRepository.cierresPendientesParaRecordar()).toHaveLength(0);
      expect(await reavisarCierresPendientes()).toBe(0);
      expect(enviarMensajeSolicitudCierreCaja).not.toHaveBeenCalled();
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});

// ── El detalle de caja que viaja en el aviso al administrador ───────────────────

describe('el detalle de caja que se envía al administrador', () => {
  it('el aviso lleva el movimiento del turno completo, no solo el desglose de dinero', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja, userId } = await abrirCaja();
      await query(
        `UPDATE cajas SET venta = ?, servicio = ?, propina = ?, comision = ?, anticipo = ?, iva = ?
         WHERE id_caja = ?`,
        [78000, 40000, 9000, 7000, 2000, 15000, idCaja]
      );
      vi.clearAllMocks();

      await solicitarOProcesarCierreCaja({
        user: { id: userId, role: 'cajero', nick: 'CajeroTest' },
        id_caja: idCaja
      });

      expect(enviarMensajeSolicitudCierreCaja).toHaveBeenCalledOnce();
      const enviado = (enviarMensajeSolicitudCierreCaja as any).mock.calls[0][0];

      // Movimiento del turno: lo que la caja produjo, ademas del dinero que hay en el cajon.
      expect(enviado.ventas).toBe(78000);
      expect(enviado.servicios).toBe(40000);
      expect(enviado.propinas).toBe(9000);
      expect(enviado.comisiones).toBe(7000);
      expect(enviado.anticipos).toBe(2000);
      expect(enviado.iva).toBe(15000);

      // El prepago del turno lo calcula el repositorio; aca importa que viaje como numero.
      expect(typeof enviado.prepagoCargado).toBe('number');
      expect(typeof enviado.prepagoConsumido).toBe('number');
      expect(typeof enviado.prepagoPendienteClientes).toBe('number');

      // El detalle no cambia el flujo: sigue siendo el aviso original, no un reenvio.
      expect(enviado.reenvio).toBeFalsy();
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('el link de autorización trae el mismo detalle, para mostrarlo en pantalla', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const saldoInicialClientes = await CashRegisterRepository.saldosPendientesClientes();
      const { idCaja } = await abrirCaja();
      await crearClienteConSaldo(12000);
      const saldoTotalClientes = saldoInicialClientes + 12000;
      await query(
        `UPDATE cajas SET venta = ?, servicio = ?, propina = ?, comision = ?, anticipo = ?, iva = ?
         WHERE id_caja = ?`,
        [78000, 40000, 9000, 7000, 2000, 15000, idCaja]
      );

      const { token } = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });

      // Es la misma llamada que hace la página pública del link al abrirla.
      const solicitud = await CashRegisterRepository.getSolicitudCierreByToken(token);
      expect(solicitud).not.toBeNull();

      // Movimiento del turno: lo que la caja produjo.
      expect(Number(solicitud.venta)).toBe(78000);
      expect(Number(solicitud.servicio)).toBe(40000);
      expect(Number(solicitud.propina)).toBe(9000);
      expect(Number(solicitud.comision)).toBe(7000);
      expect(Number(solicitud.anticipo)).toBe(2000);
      expect(Number(solicitud.iva)).toBe(15000);

      // Dinero en caja: el desglose que ya mostraba la página sigue viajando.
      expect(Number(solicitud.monto_apertura)).toBe(100000);
      expect(Number(solicitud.efectivo)).toBe(50000);
      expect(Number(solicitud.retiro_total)).toBe(0);
      expect(Number(solicitud.saldo_clientes_descontado)).toBe(saldoTotalClientes);

      // Prepago del turno, calculado al abrir el link como en el aviso.
      expect(typeof solicitud.prepago_cargado).toBe('number');
      expect(typeof solicitud.prepago_consumido).toBe('number');
      expect(Number(solicitud.prepago_pendiente_clientes)).toBe(saldoTotalClientes);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});

// ── El estado del aviso que muestra la página del link ───────────────────────────

describe('el estado del aviso que ve el administrador en el link', () => {
  /** Para "retroceder" un sello hay que usar el reloj de negocio, no el de la base. */
  const minutosAtrasEnHoraDeNegocio = (minutos: number) =>
    getNowInBusinessTimezone(new Date(Date.now() - minutos * 60_000));

  it('cuenta cuántas veces se avisó y dice desde cuándo no hay respuesta', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      const { token } = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });

      // El aviso original cuenta como uno, y se setea al pedir el cierre.
      let solicitud: any = await CashRegisterRepository.getSolicitudCierreByToken(token);
      expect(Number(solicitud.avisos_enviados)).toBe(1);
      expect(solicitud.ultimo_aviso_en).not.toBeNull();
      expect(Number(solicitud.minutos_sin_respuesta)).toBeGreaterThanOrEqual(0);

      // Cada envío posterior (reenvío manual o recordatorio del cron) suma uno.
      await CashRegisterRepository.registrarAvisoCierre(token);
      await CashRegisterRepository.registrarAvisoCierre(token);

      // 12 min sin respuesta, medidos en hora de negocio como los calcula el SQL.
      await query('UPDATE solicitudes_cierre_caja SET fecha_solicitud = ? WHERE token = ?', [
        minutosAtrasEnHoraDeNegocio(12),
        token
      ]);

      solicitud = await CashRegisterRepository.getSolicitudCierreByToken(token);
      expect(Number(solicitud.avisos_enviados)).toBe(3);
      expect(Number(solicitud.minutos_sin_respuesta)).toBeGreaterThanOrEqual(12);
      expect(Number(solicitud.minutos_sin_respuesta)).toBeLessThan(60);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});

// ── El monto de cierre y el detalle hablan del mismo cajón ────────────────────────

describe('el monto de cierre previsto cuadra con el detalle', () => {
  it('un retiro real baja el efectivo de la caja y no se descuenta dos veces', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja, userId } = await abrirCaja();

      // Retiro por el flujo real: descuenta `cajas.efectivo`, no es una fila suelta.
      await WithdrawalService.addRetiro({
        caja_id: idCaja,
        monto: 20000,
        motivo: 'Retiro para el cambio de turno',
        usuario_id: userId
      } as any);

      const [cajaRow] = await query(
        'SELECT monto_apertura, efectivo, tarjeta, transferencia, devolucion FROM cajas WHERE id_caja = ?',
        [idCaja]
      );
      // 50.000 del turno − 20.000 que salieron del cajón.
      expect(Number(cajaRow.efectivo)).toBe(30000);

      const saldos = await CashRegisterRepository.saldosPendientesClientes();
      const monto = CashRegisterRepository.calcularMontoCierre(cajaRow, saldos);

      // Si el monto volviera a restar el retiro, quedaría 20.000 abajo del cajón.
      expect(monto).toBe(100000 + 30000 + 20000 + 5000 - 3000 - saldos);

      // El detalle del dashboard tiene que dar exactamente el mismo número.
      const detalle = buildCajaDetailsNumbers(
        {
          monto_apertura: Number(cajaRow.monto_apertura),
          efectivo: Number(cajaRow.efectivo),
          tarjeta: Number(cajaRow.tarjeta),
          transferencia: Number(cajaRow.transferencia),
          devoluciones: Number(cajaRow.devolucion),
          anticipo: 0,
          saldo_clientes_descontado: saldos
        },
        {},
        {
          ventasTragosChicas: {},
          ventasChampagne: {},
          ventasBarras: {}
        },
        [{ monto: 20000 }]
      );
      expect(detalle.totalReal).toBe(monto);
      // Se descuentan los saldos prepago de la base además del retiro ya aplicado.
      expect(detalle.efectivoNeto).toBe(127000 - saldos);
      expect(detalle.egresosCaja).toBe(3000 + saldos);
      // El resumen del turno sí sigue mostrando el retiro: es otra vista.
      expect(detalle.totalEgresos).toBe(3000 + 20000 + saldos);

      // El resumen (`?resumen=1`) también ve el retiro: antes `SELECT c.*` sin el
      // subselect de `retiros_caja` hacía que el mapeo inventara un 0.
      const resumen = await CashRegisterRepository.summary();
      expect(Number(resumen.retiro_total)).toBe(20000);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});

describe('el flag de cierre pendiente que consumen la lista y el detalle', () => {
  it('mientras la solicitud espera, la caja dice que tiene el cierre pendiente y quién lo pidió', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      await crearClienteConSaldo(12000);
      await CashRegisterRepository.solicitarCierre(idCaja, { nombre: 'CajeroTest' });

      const enLista = (await CashRegisterRepository.getAll()).find(c => c.id_caja === idCaja);
      expect(enLista?.cierre_pendiente).toBe(true);
      expect(enLista?.cierre_solicitado_por).toBe('CajeroTest');
      expect(enLista?.cierre_solicitado_en).not.toBeNull();
      // La caja sigue abierta: el flag no la cierra.
      expect(enLista?.estado).toBe(1);

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.cierre_pendiente).toBe(true);
      expect(detalle?.cierre_solicitado_por).toBe('CajeroTest');
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('al rechazar el cierre, el aviso desaparece y la caja sigue abierta', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja } = await abrirCaja();
      const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });

      await CashRegisterRepository.procesarSolicitudCierre(solicitud.token, 'rechazar', {
        nombre: 'Admin'
      });

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.cierre_pendiente).toBe(false);
      expect(detalle?.cierre_solicitado_por).toBeNull();
      expect(detalle?.cierre_solicitado_en).toBeNull();
      expect(detalle?.estado).toBe(1);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });

  it('si el administrador cierra en el acto, la solicitud pendiente queda resuelta y no colgada', async () => {
    const snapshot = await snapshotDatabase();
    try {
      const { idCaja, userId } = await abrirCaja();
      await crearClienteConSaldo(12000);
      const solicitud = await CashRegisterRepository.solicitarCierre(idCaja, {
        nombre: 'CajeroTest'
      });

      // El cajero pidió autorización y el administrador cierra desde el dashboard antes
      // de responder el link: la solicitud no puede quedar 'pendiente' para siempre.
      const resultado = await solicitarOProcesarCierreCaja({
        user: { id: userId, role: 'administrador', nick: 'Admin' },
        id_caja: idCaja
      });

      expect(resultado.estado).toBe('cerrada');

      const [sol] = await query(
        'SELECT estado, resuelto_por FROM solicitudes_cierre_caja WHERE token = ?',
        [solicitud.token]
      );
      expect(sol.estado).toBe('aprobada');
      expect(sol.resuelto_por).toBe('Admin');

      const detalle = await CashRegisterRepository.getById(idCaja);
      expect(detalle?.estado).toBe(0);
      expect(detalle?.cierre_pendiente).toBe(false);
    } finally {
      await restoreDatabase(snapshot, 'test-only');
    }
  });
});
