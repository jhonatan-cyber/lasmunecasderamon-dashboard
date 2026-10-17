import { query, withTransaction } from '@/lib/database/db';
import { generateUUID } from '@/lib/database/db';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { ConflictError, ValidationError } from '@/lib/errors/errors';

export interface Colacion {
  id: string;
  usuario_id: string;
  trabajador: string;
  nick: string | null;
  presentacion_id: string | null;
  nombre_bebida: string | null;
  acompanamiento: 'gaseosa' | 'soda' | null;
  caja_id: string;
  registrado_por: string;
  registrado_por_nombre: string;
  fecha: string;
  fecha_crea: string;
}

export async function listarColaciones(
  fecha = getNowInBusinessTimezone().slice(0, 10),
  cajaId?: string
) {
  return query<Colacion[]>(
    `SELECT c.id, c.usuario_id,
            (u.nombre || ' ' || u.apellido) AS trabajador, u.nick,
            c.presentacion_id, c.nombre_bebida, c.acompanamiento, c.caja_id,
            c.registrado_por, (r.nombre || ' ' || r.apellido) AS registrado_por_nombre,
            c.fecha, c.fecha_crea
       FROM colaciones c
       JOIN usuarios u ON u.id_usuario = c.usuario_id
       JOIN usuarios r ON r.id_usuario = c.registrado_por
      WHERE ${cajaId ? 'c.caja_id = ?' : 'c.fecha = ?'}
      ORDER BY c.fecha_crea DESC`,
    cajaId ? [cajaId] : [fecha]
  );
}

export async function registrarColacion(input: {
  usuarioId: string;
  presentacionId: string;
  nombreBebida: string;
  acompanamiento: 'gaseosa' | 'soda' | null;
  registradoPor: string;
}) {
  if (!input.usuarioId || !input.registradoPor)
    throw new ValidationError('Selecciona un trabajador');
  if (!input.presentacionId || !input.nombreBebida?.trim())
    throw new ValidationError('Selecciona una bebida habilitada para colación');
  if (input.acompanamiento !== null && !['gaseosa', 'soda'].includes(input.acompanamiento))
    throw new ValidationError('Selecciona un acompañamiento válido');

  const fechaHora = getNowInBusinessTimezone();
  const fecha = fechaHora.slice(0, 10);
  const id = generateUUID();

  return withTransaction(async trx => {
    const workers = await trx<{ id_usuario: string }[]>(
      `SELECT u.id_usuario FROM usuarios u
       LEFT JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = ? AND u.estado = 1
         AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
       FOR UPDATE OF u`,
      [input.usuarioId]
    );
    if (!workers.length) throw new ValidationError('El trabajador no existe o está inactivo');

    const bebidas = await trx<{ id: string; opciones_venta: unknown }[]>(
      `SELECT p.id, p.opciones_venta FROM inventario_presentaciones p
       WHERE p.id = ? AND EXISTS (
         SELECT 1 FROM inventario_unidades u
         WHERE u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion = 'bar'
       ) AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
         WHERE opcion->>'tipo' = 'botella' AND opcion->>'colacion_habilitada' = 'true'
       ) FOR UPDATE`,
      [input.presentacionId]
    );
    if (!bebidas.length)
      throw new ValidationError('La bebida ya no está habilitada o no tiene stock en el bar');
    let options: unknown = bebidas[0].opciones_venta;
    if (typeof options === 'string') {
      try {
        options = JSON.parse(options);
      } catch {
        throw new ValidationError('La configuración de la bebida no es válida');
      }
    }
    const bottle = Array.isArray(options)
      ? options.find(option => option?.tipo === 'botella')
      : null;
    const acompConfig = bottle?.acompanamiento;
    const acompUnidades = Number(acompConfig?.unidades ?? 0);
    if (acompUnidades === 0 && input.acompanamiento !== null)
      throw new ValidationError('Esta bebida no tiene acompañamiento configurado');

    const caja = await trx<{ id_caja: string }[]>(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1 FOR UPDATE',
      []
    );
    if (!caja.length) throw new ValidationError('Abre una caja antes de registrar colaciones');

    const duplicate = await trx<{ id: string }[]>(
      'SELECT id FROM colaciones WHERE usuario_id = ? AND caja_id = ? LIMIT 1',
      [input.usuarioId, caja[0].id_caja]
    );
    if (duplicate.length)
      throw new ConflictError('Este trabajador ya recibió su colación durante este turno de caja');

    await trx(
      `INSERT INTO colaciones
        (id, usuario_id, presentacion_id, nombre_bebida, acompanamiento, cantidad, precio, metodo_pago, caja_id, registrado_por, fecha, fecha_crea)
       VALUES (?, ?, ?, ?, ?, 1, 0, 'efectivo', ?, ?, ?, ?)
       ON CONFLICT (usuario_id, caja_id) DO NOTHING`,
      [
        id,
        input.usuarioId,
        input.presentacionId,
        input.nombreBebida.trim(),
        input.acompanamiento,
        caja[0].id_caja,
        input.registradoPor,
        fecha,
        fechaHora
      ]
    );
    const inserted = await trx<{ id: string }[]>('SELECT id FROM colaciones WHERE id = ? LIMIT 1', [
      id
    ]);
    if (!inserted.length)
      throw new ConflictError('Este trabajador ya recibió su corto durante este turno de caja');
    return { id, caja_id: caja[0].id_caja, fecha };
  });
}
