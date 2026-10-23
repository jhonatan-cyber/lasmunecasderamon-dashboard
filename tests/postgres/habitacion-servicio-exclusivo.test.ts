import { afterAll, expect, it } from 'vitest';
import db, { query } from '@/lib/database/db';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { validarHabitacionDisponibleParaServicio } from '@/modules/operacion/servicios/repositorio';
import { ocuparHabitacionVenta } from '@/modules/operacion/facturacion/servicio';

afterAll(async () => {
  await db.pool.end();
  globalThis.__lasMunecasPgPool = undefined;
});

async function crearHabitacion(precio: number, tiempo: number, comision: number): Promise<string> {
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO habitaciones
    (id_habitacion, nombre, precio, tiempo, comision_anfitriona, estado, fecha_crea)
    VALUES (?, ?, ?, ?, ?, 1, now())`,
    [id, `EXC${id.slice(0, 6)}`, precio, tiempo, comision]
  );
  return id;
}

async function borrarHabitacion(id: string): Promise<void> {
  await query('DELETE FROM habitaciones WHERE id_habitacion = ?', [id]);
}

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
    await borrarHabitacion(id);
  }
});

it('una habitación sin precio, comisión ni duración nunca queda ocupada por una venta', async () => {
  const id = await crearHabitacion(0, 0, 0);
  try {
    await enUnaUnidad(unidad =>
      unidad.ejecutar(async contexto => {
        await ocuparHabitacionVenta(id, contexto);
      })
    );

    const [fila] = await query<{ estado: number }[]>(
      'SELECT estado FROM habitaciones WHERE id_habitacion = ?',
      [id]
    );
    expect(Number(fila.estado)).toBe(1);
  } finally {
    await borrarHabitacion(id);
  }
});

it('rechaza abrir un privado/servicio en una habitación solo de ventas', async () => {
  const id = await crearHabitacion(0, 0, 0);
  try {
    await expect(
      enUnaUnidad(unidad =>
        unidad.ejecutar(async contexto => {
          await validarHabitacionDisponibleParaServicio(id, contexto);
        })
      )
    ).rejects.toThrow('solo está disponible para ventas con habitación');
  } finally {
    await borrarHabitacion(id);
  }
});
