import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { enUnaUnidad } from '@/lib/transaccion/contrato';
import { validarHabitacionDisponibleParaServicio } from '@/modules/operacion/servicios/repositorio';
import { ocuparHabitacionVenta } from '@/modules/operacion/facturacion/servicio';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

it('solo una transacción puede reservar la misma habitación libre', async () => {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO habitaciones
    (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
    VALUES (?, ?, 50000, 2, 0, 1, now())`,
    [id, `EXC${id.slice(0, 6)}`]
  );
  try {
    const reservar = () =>
      enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          await validarHabitacionDisponibleParaServicio(id, contexto);
          await ocuparHabitacionVenta(id, contexto);
        })
      );
    const resultados = await Promise.allSettled([reservar(), reservar()]);
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    const rechazada = resultados.find(r => r.status === 'rejected');
    expect(rechazada?.status === 'rejected' && rechazada.reason.message).toContain('ocupada');
  } finally {
    await query('DELETE FROM habitaciones WHERE id_habitacion = ?', [id]);
  }
});
