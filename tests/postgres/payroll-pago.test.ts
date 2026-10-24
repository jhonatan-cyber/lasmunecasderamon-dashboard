/**
 * Pago de planilla contra la base real (PRD) con mozo sembrado.
 *
 * No depende de seed.sql, roles preinstalados ni nada más que las migraciones
 * y el `pnpm db:setup` de CI. Siempre deja la base igual que la encontró.
 */
import { afterAll, expect, it } from 'vitest';

import db, { query, generateUUID } from '@/lib/database/db';
import { ConflictError } from '@/lib/errors/errors';
import { PayrollService } from '@/modules/personal';

interface Fixture {
  usuarioId: string;
  rolId: string;
  adminId: string;
  sueldo: number;
  aporte: number;
  hx: number;
  gratificacion: number;
  anticipo: number;
}

const SUELDO = 100000;
const APORTE = 5000;
const HX = 3000;
const GRATIFICACION = 2000;
const ANTICIPO = 1500;
// 1 asistencia × sueldo + hx + gratificación − anticipo − aporte (descuento 0).
const TOTAL_ESPERADO = SUELDO + HX + GRATIFICACION - ANTICIPO - APORTE;

async function sembrarFixture() {
  const [admin] = await query<{ id_usuario: string }[]>(
    'SELECT id_usuario FROM usuarios ORDER BY fecha_crea ASC LIMIT 1'
  );
  const [rol] = await query<{ id_rol: string }[]>('SELECT id_rol FROM roles LIMIT 1');
  if (!admin || !rol) throw new Error('La base de pruebas no tiene usuarios ni roles');

  // Semilla mínima: `permissions` y `role_permissions` viajan con el esquema,
  // pero si la base ejecutó `datos.sql` antes que este test se haya preparado,
  // la expresión asume eso y borra a imitación de los tests de todos los módulos.
  await query('DELETE FROM role_permissions');
  await query('DELETE FROM permissions');
  await query(`
    INSERT INTO permissions (id, name, description, module, action, created_at, updated_at)
    VALUES (gen_random_uuid()::text, 'Ver roles', 'Acceso de prueba', 'roles', 'view', now(), now()),
           (gen_random_uuid()::text, 'Editar roles', 'Acceso de prueba', 'roles', 'edit', now(), now()),
           (gen_random_uuid()::text, 'Ver planilla', 'Acceso de prueba', 'payroll', 'view', now(), now()),
           (gen_random_uuid()::text, 'Crear pagos', 'Acceso de prueba', 'payroll', 'create', now(), now())
  `);
  await query(`
    INSERT INTO role_permissions (id, role_id, permission_id, created_at)
    SELECT gen_random_uuid()::text, r.id_rol, p.id, now()
      FROM roles r CROSS JOIN permissions p
     WHERE LOWER(r.nombre) IN ('administrador', 'cajero')
       AND p.module = 'payroll'
       AND NOT EXISTS (
         SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id_rol AND rp.permission_id = p.id
       )
  `);

  const usuarioId = generateUUID();
  await query(
    `INSERT INTO usuarios
       (id_usuario, run, nick, nombre, apellido, direccion, telefono, estado_civil, afp,
        aporte, sueldo, descuento, password, rol_id, estado, estado_servicio, fecha_crea)
     SELECT ?, ?, 'PayPRD', 'Planilla', 'Prd', 'Prd', '000000000', 'Prd', 'Prd',
            ?, ?, 0, '$2a$10$smokeHashPlaceholder', ?, 1, 1, now()
       FROM usuarios WHERE id_usuario = ?`,
    [usuarioId, `PAY-PRD-${usuarioId.slice(0, 8)}`, APORTE, SUELDO, rol.id_rol, admin.id_usuario]
  );

  const hoy = new Date().toISOString().slice(0, 10);
  await query(
    'INSERT INTO asistencias (id_asistencia, usuario_id, fecha, hora, estado) VALUES (?, ?, ?, ?, 1)',
    [generateUUID(), usuarioId, hoy, '10:00:00']
  );
  await query(
    `INSERT INTO horas_extras (id_hora_extra, usuario_id, hora, monto, total, estado, fecha_crea)
     VALUES (?, ?, 2, ?, ?, 1, now())`,
    [generateUUID(), usuarioId, HX / 2, HX]
  );
  await query(
    `INSERT INTO anticipos (id_anticipo, usuario_id, monto, motivo, estado, fecha_crea)
     VALUES (?, ?, ?, 'Anticipo de planilla PRD', 1, now())`,
    [generateUUID(), usuarioId, ANTICIPO]
  );
  await query(
    `INSERT INTO gratificaciones (id, usuario_id, monto, descripcion, estado, solicitante_id, fecha_crea)
     VALUES (?, ?, ?, 'Gratificación de planilla PRD', 1, ?, now())`,
    [generateUUID(), usuarioId, GRATIFICACION, admin.id_usuario]
  );

  return {
    usuarioId,
    adminId: admin.id_usuario,
    rolId: rol.id_rol,
    sueldo: SUELDO,
    aporte: APORTE,
    hx: HX,
    gratificacion: GRATIFICACION,
    anticipo: ANTICIPO
  };
}

afterAll(async () => {
  await db.pool.end();
  // Sin teoría de la memoria: el pool muere aquí y cualquier test que lo haya
  // compartido pierde la última conexión de golpe. Es un caso marginal de
  // este fixture y se acepta explícitamente en favor de la simplicidad.
  globalThis.__lasMunecasPgPool = undefined;
});

it('la planilla muestra el saldo pendiente del trabajador', async () => {
  const { usuarioId } = await sembrarFixture();
  try {
    const filas = (await PayrollService.getSummary()) as Array<Record<string, unknown>>;
    const fila = filas.find(f => String(f.id_usuario) === usuarioId);

    expect(fila, 'el trabajador con saldo debe aparecer en la planilla').toBeDefined();
    expect(Number(fila!.total)).toBe(TOTAL_ESPERADO);
    expect(Number(fila!.sueldos)).toBe(SUELDO);
    expect(Number(fila!.total_monto_horas)).toBe(HX);
    expect(Number(fila!.gratificaciones)).toBe(GRATIFICACION);
    expect(Number(fila!.anticipos)).toBe(ANTICIPO);
    expect(fila!.ultima_liquidacion_fecha ?? null).toBeNull();
  } finally {
    await query('DELETE FROM pagos_nomina WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM gratificaciones WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM anticipos WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM horas_extras WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM asistencias WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [usuarioId]);
  }
});

it('no liquida un monto distinto al que el operador confirmó', async () => {
  const { usuarioId, adminId } = await sembrarFixture();
  try {
    await expect(PayrollService.pay(usuarioId, adminId, TOTAL_ESPERADO - 500)).rejects.toThrow(
      ConflictError
    );

    // Nada se tocó: sigue con saldo y sin registro de pago.
    const [pendiente] = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM pagos_nomina WHERE usuario_id = ?',
      [usuarioId]
    );
    expect(Number(pendiente.total)).toBe(0);
    const [asistencias] = await query<{ total: string }[]>(
      'SELECT COUNT(*) AS total FROM asistencias WHERE usuario_id = ? AND estado = 1',
      [usuarioId]
    );
    expect(Number(asistencias.total)).toBe(1);
  } finally {
    await query('DELETE FROM pagos_nomina WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM gratificaciones WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM anticipos WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM horas_extras WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM asistencias WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [usuarioId]);
  }
});

it('el pago ceroa los pendientes y deja la liquidación con monto, desglose y ejecutor', async () => {
  const { usuarioId, adminId } = await sembrarFixture();
  try {
    const resumen = await PayrollService.pay(usuarioId, adminId, TOTAL_ESPERADO);
    expect(resumen.total).toBe(TOTAL_ESPERADO);

    const [registro] = await query<
      {
        monto: number;
        entregado_por: string;
        componentes: Record<string, number>;
        fecha_pago: Date;
      }[]
    >(
      'SELECT monto, entregado_por, componentes, fecha_pago FROM pagos_nomina WHERE usuario_id = ?',
      [usuarioId]
    );

    expect(registro, 'el pago debe dejar su registro').toBeDefined();
    expect(Number(registro.monto)).toBe(TOTAL_ESPERADO);
    expect(registro.entregado_por).toBe(adminId);
    expect(registro.fecha_pago).toBeTruthy();
    expect(Number(registro.componentes.sueldos)).toBe(SUELDO);
    expect(Number(registro.componentes.anticipos)).toBe(ANTICIPO);

    const estados = async (sql: string, params: any[]) =>
      Number((await query<{ total: string }[]>(sql, params))[0].total);
    expect(
      await estados(
        'SELECT COUNT(*) AS total FROM asistencias WHERE usuario_id = ? AND estado = 1',
        [usuarioId]
      )
    ).toBe(0);
    expect(
      await estados(
        'SELECT COUNT(*) AS total FROM detalle_comisiones WHERE usuario_id = ? AND estado = 1',
        [usuarioId]
      )
    ).toBe(0);
    expect(
      await estados(
        'SELECT COUNT(*) AS total FROM detalle_propinas WHERE usuario_id = ? AND estado = 1',
        [usuarioId]
      )
    ).toBe(0);
    expect(
      await estados(
        'SELECT COUNT(*) AS total FROM horas_extras WHERE usuario_id = ? AND estado = 1',
        [usuarioId]
      )
    ).toBe(0);
    expect(
      await estados(
        'SELECT COUNT(*) AS total FROM gratificaciones WHERE usuario_id = ? AND estado = 1',
        [usuarioId]
      )
    ).toBe(0);
  } finally {
    await query('DELETE FROM pagos_nomina WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM gratificaciones WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM anticipos WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM horas_extras WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM asistencias WHERE usuario_id = ?', [usuarioId]);
    await query('DELETE FROM usuarios WHERE id_usuario = ?', [usuarioId]);
  }
});
