import { ServiceSchema, type ServiceType } from '@/lib/business/schemas';

export function parseMixedPayments(raw: unknown): Array<{ metodo: string; monto: number }> {
  if (!raw) return [];

  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((item: any) => ({
      metodo: String(item?.metodo || ''),
      monto: Number(item?.monto || 0)
    }))
    .filter(item => item.metodo && item.monto > 0);
}

export function mapServiceFromDB(row: any): ServiceType {
  if (!row) return null as any;

  const creatorName =
    row.creator_nick ||
    [row.creator_nombre, row.creator_apellido].filter(Boolean).join(' ').trim() ||
    row.usuario_nick ||
    [row.creator_name, row.creator_last_name].filter(Boolean).join(' ').trim() ||
    null;

  const anfitrionasIds = row.anfitrionas_ids
    ? String(row.anfitrionas_ids).split(',').filter(Boolean)
    : [];
  const numAnfitrionas = Math.max(1, anfitrionasIds.length);

  const habitacionComision = row.habitacion_comision ? Number(row.habitacion_comision) : 0;
  const precioServicio = Number(row.precio_servicio || 0);
  const tieneComisionHabitacion = habitacionComision > 0;
  const totalComision = tieneComisionHabitacion
    ? habitacionComision
    : precioServicio * numAnfitrionas;
  const comisionIndividual = tieneComisionHabitacion
    ? Math.floor(habitacionComision / numAnfitrionas)
    : precioServicio;

  return ServiceSchema.parse({
    id: row.id_servicio,
    codigo: row.codigo,
    cliente_id: row.cliente_id,
    habitacion_id: row.habitacion_id,
    precio_habitacion: Number(row.precio_habitacion || 0),
    precio_servicio: Number(row.precio_servicio || 0),
    iva: Number(row.iva || 0),
    sub_total: Number(row.sub_total || 0),
    total: Number(row.total || 0),
    tiempo: Number(row.tiempo || 0),
    metodo_pago: row.metodo_pago,
    estado: row.estado,
    fecha_crea: row.fecha_crea || null,
    fecha_mod: row.fecha_mod || null,
    habitacion_nombre: row.habitacion_numero || row.habitacion_nombre || row.habitacion_name,
    habitacion_numero: row.habitacion_numero || row.habitacion_nombre || row.habitacion_name,
    anfitrionas_nombres: row.anfitrionas_nombres || row.anfitrionas,
    anfitrionas_ids: row.anfitrionas_ids,
    total_usuarios: numAnfitrionas,
    created_by: row.created_by,
    creator_nick: row.creator_nick || null,
    creator_nombre: row.creator_nombre || null,
    creator_apellido: row.creator_apellido || null,
    creator_foto: row.creator_foto || null,
    waiter_name: creatorName,
    waiter_foto: row.creator_foto || null,
    cliente_nombre: row.cliente_nombre || null,
    pagos_mixtos: row.pagos_mixtos ? parseMixedPayments(row.pagos_mixtos) : [],
    es_temporal: Number(row.es_temporal || 0),
    servicio_original_id: row.servicio_original_id || null,
    habitacion_comision: habitacionComision > 0 ? habitacionComision : null,
    total_comision: totalComision,
    comision_individual: comisionIndividual
  });
}
