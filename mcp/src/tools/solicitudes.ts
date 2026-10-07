import { z } from 'zod';
import { paginar, paginacion } from '../paginacion.js';
import { api } from '../api-client.js';
import { esquemaSalida, fallo, envolver } from '../formato.js';

const ruta = '/api/mcp/admin/solicitudes';
const tipo = z.enum([
  'anticipo',
  'devolucion',
  'gratificacion',
  'servicio',
  'transferencia',
  'cierre_caja',
  'anulacion_venta',
  'anulacion_servicio',
  'anulacion_cuenta'
]);
const id = z.string().trim().min(1).max(100);
const monto = z.number().finite().positive();
const motivo = z.string().trim().min(1).max(1000);
const confirmacion = {
  confirmar: z
    .literal(true)
    .describe(
      'Solo true después de que el administrador confirme explícitamente los datos y el efecto de esta operación.'
    ),
  operacion_id: z
    .uuid()
    .describe(
      'UUID nuevo por intención. Reutilizar el mismo UUID y datos si se perdió la respuesta; no reintentar con otra clave.'
    )
};
type Esquema = Record<string, z.ZodTypeAny>;

function herramienta(
  description: string,
  shape: Esquema,
  ejecutar: (args: any) => Promise<unknown>,
  escritura = false
) {
  const schema = z.object(shape).strict();
  return {
    description,
    inputSchema: shape,
    outputSchema: esquemaSalida,
    annotations: {
      readOnlyHint: !escritura,
      destructiveHint: escritura,
      idempotentHint: true,
      openWorldHint: false
    },
    execute: async (args: any) => {
      try {
        const data = await ejecutar(schema.parse(args));
        return envolver(data);
      } catch (error) {
        return fallo(error);
      }
    }
  };
}

function operacion(description: string, accion: string, shape: Esquema) {
  return herramienta(
    `${description} Exclusiva para administrador. Consultar el detalle y presentar los datos y efectos antes de pedir confirmación. Los permisos, estados y montos se validan en el backend.`,
    { ...shape, ...confirmacion },
    args => api('POST', ruta, { cuerpo: { accion, ...args } }),
    true
  );
}

export const consultas = {
  solicitudes_pendientes: herramienta(
    'Bandeja administrativa de anticipos, devoluciones de saldo, gratificaciones, servicios, transferencias, cierres y anulaciones. Sin tipo consulta todos. limit/offset se aplican por grupo; revisar hay_mas y paginar. total_pendientes cuenta solicitudes, no suma dinero de distintos tipos.',
    {
      tipo: tipo.optional(),
      limit: z.number().int().min(1).max(50).optional(),
      offset: z.number().int().min(0).max(100000).optional()
    },
    args => api('GET', ruta, { query: args })
  ),
  detalle_solicitud: herramienta(
    'Consulta una solicitud por tipo e id antes de resolverla. Devuelve monto y efecto de aprobación. Anticipos/devoluciones admiten consulta después de resolver; los demás tipos consultan pendientes.',
    { tipo, id },
    args => api('GET', ruta, { query: { consulta: 'detalle', ...args } })
  ),
  limite_anticipo_empleado: herramienta(
    'Consulta balance y máximo disponible para el empleado indicado, y si tiene anticipo pendiente. No utiliza al administrador como beneficiario.',
    { usuario_id: id },
    args => api('GET', ruta, { query: { consulta: 'limite_anticipo', ...args } })
  ),
  buscar_personal: herramienta(
    'Busca personal activo por nombre, apellido o nick para resolver beneficiarios. Si hay varias coincidencias, pedir al administrador que seleccione; no adivinar identificadores.',
    { search: z.string().trim().max(100).optional(), ...paginacion },
    async args => {
      const respuesta = await api<any>('GET', '/api/public/users');
      const filas = Array.isArray(respuesta) ? respuesta : (respuesta.users ?? []);
      const normalizar = (s: string) =>
        s
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase();
      const filtro = normalizar(args.search ?? '');
      const personal = filas
        .filter((u: any) => normalizar(`${u.name ?? ''} ${u.nick ?? ''}`).includes(filtro))
        .map((u: any) => ({ id: u.id, nombre: u.name, nick: u.nick, rol: u.role }));
      return paginar(personal, args);
    }
  )
};

export const operaciones = {
  solicitar_anticipo_empleado: operacion(
    'Crea un anticipo PENDIENTE para un empleado. No lo aprueba ni entrega dinero; comprobar limite_anticipo_empleado.',
    'crear_anticipo',
    { usuario_id: id, monto, motivo }
  ),
  solicitar_devolucion_cliente: operacion(
    'Crea una devolución PENDIENTE de saldo prepago para el cliente. No descuenta saldo ni ejecuta pagos.',
    'crear_devolucion',
    { cliente_id: id, monto, motivo }
  ),
  solicitar_gratificacion_empleado: operacion(
    'Crea una gratificación PENDIENTE de aprobación para un empleado; no la incorpora como aprobada a la planilla.',
    'crear_gratificacion',
    { usuario_id: id, monto, motivo }
  ),
  solicitar_transferencia_bar: operacion(
    'Reserva unidades del almacén y crea una transferencia PENDIENTE al bar, usando los precios guardados de la presentación.',
    'crear_transferencia',
    { producto_id: id, presentacion_id: id, cantidad: z.number().int().positive().max(10000) }
  ),
  solicitar_anulacion: operacion(
    'Solicita anulación de venta, servicio o cuenta. monto es el monto solicitado: servicio solo admite el total; venta y cuenta pueden admitir parcial según backend.',
    'crear_anulacion',
    {
      tipo: z.enum(['anulacion_venta', 'anulacion_servicio', 'anulacion_cuenta']),
      entidad_id: id,
      monto,
      motivo
    }
  ),
  solicitar_servicio: operacion(
    'Crea una solicitud de servicio PENDIENTE para la habitación y anfitrionas seleccionadas. No crea todavía el servicio activo.',
    'crear_servicio',
    {
      cliente_id: id.optional(),
      habitacion_id: id,
      anfitrionas_ids: z.array(id).min(1).max(20),
      precio_servicio: z.number().finite().nonnegative(),
      precio_habitacion: z.number().finite().nonnegative(),
      comision_anfitriona: z.number().finite().nonnegative(),
      num_clientes: z.number().int().positive(),
      tiempo: z.number().int().positive(),
      metodo_pago: z.enum(['efectivo', 'tarjeta', 'transferencia', 'prepago']),
      total: monto,
      iva: z.number().finite().nonnegative()
    }
  ),
  resolver_solicitud: operacion(
    'Aprueba o rechaza una solicitud pendiente. Usar monto_esperado del detalle (transferencia: 0). Aprobar devolución DESCUENTA saldo y registra devolución, pero no ordena transferencia bancaria. Aprobar anticipo NO entrega dinero; gratificación queda por pagar. Cierre cierra caja y recalcula montos. Rechazar servicio requiere motivo.',
    'resolver',
    {
      tipo,
      solicitud_id: id,
      decision: z.enum(['aprobar', 'rechazar']),
      monto_esperado: z.number().finite().nonnegative(),
      motivo: motivo.optional()
    }
  ),
  entregar_anticipo: operacion(
    'Registra ENTREGA de un anticipo aprobado y descuenta efectivo de caja. Ejecutar solamente cuando el administrador confirme la entrega real; no equivale a aprobar.',
    'entregar_anticipo',
    { solicitud_id: id, monto_esperado: monto }
  ),
  cerrar_caja_administrador: operacion(
    'CIERRA la caja directamente como administrador, resolviendo su solicitud pendiente si existe. No crea una solicitud para que el administrador se autorice a sí mismo. Revisar estado_caja y confirmar el cierre.',
    'cerrar_caja',
    { caja_id: id, motivo }
  )
};
