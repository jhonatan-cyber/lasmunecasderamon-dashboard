import { query } from '@/lib/database/db';
import { generateUUID } from '@/lib/database/db';
import { enUnaUnidad } from '@/lib/transaction/contract';
import { resolverTransaccion } from '@/lib/transaction/infrastructure';
import { consumirColacionBar } from '@/modules/inventario';
import { getNowInBusinessTimezone } from '@/lib/business/timezoneService';
import { acompanamientoDeColacion, mlDeColacion } from '@/lib/business/colacionConfig';
import {
  CATEGORIA_BEBIDAS_ANALCOHOLICAS,
  productoPermitidoParaRol,
  reglaColacionPorRol
} from '@/lib/business/colacionRoles';
import { ConflictError, ValidationError } from '@/lib/errors/errors';

export interface Colacion {
  id: string;
  usuario_id: string;
  trabajador: string;
  nick: string | null;
  presentacion_id: string | null;
  nombre_bebida: string | null;
  ml_bebida: number;
  acompanamiento: 'gaseosa' | 'soda' | null;
  acompanamiento_presentacion_id: string | null;
  acompanamiento_nombre: string | null;
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
            c.presentacion_id, c.nombre_bebida, c.ml_bebida, c.acompanamiento,
            c.acompanamiento_presentacion_id,
            CASE WHEN c.acompanamiento_presentacion_id IS NULL THEN NULL
                 ELSE NULLIF(TRIM(apr.nombre || ' ' || ap.nombre), '') END AS acompanamiento_nombre,
            c.caja_id,
            c.registrado_por, (r.nombre || ' ' || r.apellido) AS registrado_por_nombre,
            c.fecha, c.fecha_crea
       FROM colaciones c
       JOIN usuarios u ON u.id_usuario = c.usuario_id
       JOIN usuarios r ON r.id_usuario = c.registrado_por
       LEFT JOIN inventario_presentaciones ap ON ap.id = c.acompanamiento_presentacion_id
       LEFT JOIN productos apr ON apr.id_producto = ap.producto_id
      WHERE ${cajaId ? 'c.caja_id = ?' : 'c.fecha = ?'}
      ORDER BY c.fecha_crea DESC`,
    cajaId ? [cajaId] : [fecha]
  );
}

export async function registrarColacion(input: {
  usuarioId: string;
  presentacionId: string;
  acompanamiento: 'gaseosa' | 'soda' | null;
  /** Presentación de la bebida analcohólica que acompaña al producto. */
  acompanamientoPresentacionId?: string | null;
  registradoPor: string;
}) {
  if (!input.usuarioId || !input.registradoPor)
    throw new ValidationError('Selecciona un trabajador');
  if (!input.presentacionId)
    throw new ValidationError('Selecciona una bebida habilitada para colación');
  if (input.acompanamiento !== null && !['gaseosa', 'soda'].includes(input.acompanamiento))
    throw new ValidationError('Selecciona un acompañamiento válido');

  const fechaHora = getNowInBusinessTimezone();
  const fecha = fechaHora.slice(0, 10);
  const id = generateUUID();

  return enUnaUnidad(async unidad => {
    const trx = resolverTransaccion({ id: unidad.id });
    const workers = await trx<{ id_usuario: string; rol: string | null }[]>(
      `SELECT u.id_usuario, LOWER(r.nombre) AS rol FROM usuarios u
       LEFT JOIN roles r ON r.id_rol = u.rol_id
       WHERE u.id_usuario = ? AND u.estado = 1
         AND (r.nombre IS NULL OR LOWER(r.nombre) <> 'administrador')
       FOR UPDATE OF u`,
      [input.usuarioId]
    );
    if (!workers.length) throw new ValidationError('El trabajador no existe o está inactivo');

    // La regla rol → catálogo vive en `lib/business/colacionRoles` y se comparte
    // con la UI; aquí se vuelve a validar para que no dependa del cliente.
    const regla = reglaColacionPorRol(workers[0].rol);
    if (!regla) throw new ValidationError('Este rol no recibe colación');

    // El derecho del trabajador a una colación en este turno se comprueba antes
    // que el stock: si ya la recibió, ese es el motivo por el que no puede
    // registrar otra, aunque la bebida se haya agotado. La comprobación
    // definitiva se repite más abajo, con la caja bloqueada.
    const duplicadoPreliminar = await trx<{ id: string }[]>(
      `SELECT id FROM colaciones
        WHERE usuario_id = ?
          AND caja_id = (SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1)
        LIMIT 1`,
      [input.usuarioId]
    );
    if (duplicadoPreliminar.length)
      throw new ConflictError('Este trabajador ya recibió su colación durante este turno de caja');

    const bebidas = await trx<
      {
        id: string;
        opciones_venta: unknown;
        system_key: string | null;
        ml_botella: number | null;
        presentacion_nombre: string;
        producto_nombre: string;
      }[]
    >(
      `SELECT p.id, p.opciones_venta, p.ml_botella,
              p.nombre AS presentacion_nombre,
              pr.nombre AS producto_nombre,
              c.system_key
       FROM inventario_presentaciones p
       INNER JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1
       LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
       WHERE p.id = ? AND EXISTS (
         SELECT 1 FROM inventario_unidades u
         WHERE u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion = 'bar'
       ) AND EXISTS (
         SELECT 1 FROM jsonb_array_elements(COALESCE(p.opciones_venta::jsonb, '[]'::jsonb)) opcion
         WHERE opcion->>'tipo' = 'botella' AND opcion->>'colacion_habilitada' = 'true'
       ) FOR UPDATE OF p`,
      [input.presentacionId]
    );
    if (!bebidas.length)
      throw new ValidationError('La bebida ya no está habilitada o no tiene stock en el bar');
    if (!productoPermitidoParaRol(regla, bebidas[0].system_key))
      throw new ValidationError(
        'Este rol solo recibe bebidas analcohólicas habilitadas para colación'
      );
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
    // Los ml y el nombre de la colación los calcula el servidor desde la
    // misma configuración que la UI muestra, para que lo registrado, lo
    // descontado y lo mostrado no puedan divergir. El valor que declara el
    // cliente es informativo: el que manda es este, y la ruta lo devuelve en la
    // respuesta y avisa cuando no coinciden.
    const mlBebida = mlDeColacion(bottle, bebidas[0].ml_botella);
    if (!Number.isInteger(mlBebida) || mlBebida < 0 || mlBebida > 10000)
      throw new ValidationError('La configuración de la bebida define ml fuera de rango');
    const nombreBebida =
      `${bebidas[0].producto_nombre ?? ''} ${bebidas[0].presentacion_nombre ?? ''}`.trim();
    if (!nombreBebida)
      throw new ValidationError('La bebida no tiene nombre para registrar la colación');
    // Unidades configuradas para la colación; si la opción no las define se
    // heredan las bebidas incluidas por botella (configuración anterior).
    const acompanamientoConfig = acompanamientoDeColacion(bottle);
    const acompUnidades = acompanamientoConfig.unidades;
    const mlAcompanamiento = acompanamientoConfig.ml;
    const acompanamientoPresentacionId = input.acompanamientoPresentacionId?.trim() || null;
    if (acompUnidades === 0 && (input.acompanamiento !== null || acompanamientoPresentacionId))
      throw new ValidationError('Esta bebida no tiene acompañamiento configurado');

    // El acompañamiento es una bebida analcohólica con stock en el bar; igual
    // que el catálogo que ofrece la UI, no puede ser el mismo producto.
    if (acompanamientoPresentacionId) {
      const acompanamientos = await trx<{ id: string }[]>(
        `SELECT p.id
           FROM inventario_presentaciones p
           INNER JOIN productos pr ON pr.id_producto = p.producto_id AND pr.estado = 1
           LEFT JOIN categorias c ON c.id_categoria = pr.categoria_id
          WHERE p.id = ? AND p.id <> ? AND c.system_key = ?
            AND EXISTS (
              SELECT 1 FROM inventario_unidades u
              WHERE u.presentacion_id = p.id AND u.estado = 'almacen' AND u.ubicacion = 'bar'
            )`,
        [acompanamientoPresentacionId, input.presentacionId, CATEGORIA_BEBIDAS_ANALCOHOLICAS]
      );
      if (!acompanamientos.length)
        throw new ValidationError(
          'Selecciona una bebida analcohólica con stock en el bar como acompañamiento'
        );
    }

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

    // La colación es gratuita para el trabajador: no tiene columnas de precio
    // ni de método de pago (la migración 096 las eliminó) y no escribe
    // movimientos de caja; lo vigila
    // tests/unit/modules/colaciones-sin-ingreso.test.ts.
    //
    // La unicidad por turno la garantiza el SELECT ... FOR UPDATE del trabajador
    // más la comprobación de duplicado; además la migración 095 la deja
    // garantizada en la base con un índice único (usuario_id, caja_id).
    await trx(
      `INSERT INTO colaciones
        (id, usuario_id, presentacion_id, nombre_bebida, ml_bebida, acompanamiento,
         acompanamiento_presentacion_id, caja_id, registrado_por, fecha, fecha_crea)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.usuarioId,
        input.presentacionId,
        nombreBebida,
        mlBebida,
        input.acompanamiento,
        acompanamientoPresentacionId,
        caja[0].id_caja,
        input.registradoPor,
        fecha,
        fechaHora
      ]
    );
    // Descuenta del bar lo que salió con la colación: los ml de la bebida y el
    // acompañamiento (unidades completas o sus ml, según la configuración). Va
    // en la misma unidad de trabajo: si no alcanza el stock, no queda registro.
    await consumirColacionBar(
      [
        { presentacion_id: input.presentacionId, ml: mlBebida },
        ...(acompanamientoPresentacionId
          ? [
              mlAcompanamiento !== null
                ? {
                    presentacion_id: acompanamientoPresentacionId,
                    ml: mlAcompanamiento * acompUnidades
                  }
                : {
                    presentacion_id: acompanamientoPresentacionId,
                    unidades: acompUnidades
                  }
            ]
          : [])
      ],
      input.registradoPor,
      fechaHora,
      { id: unidad.id }
    );
    return {
      id,
      caja_id: caja[0].id_caja,
      fecha,
      ml_bebida: mlBebida,
      nombre_bebida: nombreBebida
    };
  });
}
