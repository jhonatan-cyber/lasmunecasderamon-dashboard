import { NextResponse } from 'next/server';
import { withAppApiWrapper } from '@/lib/api/app-api-wrapper';
import { query } from '@/lib/database/db';

export const dynamic = 'force-dynamic';

export const GET = withAppApiWrapper(
  async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (!type) {
      return NextResponse.json(
        { success: false, message: 'Tipo de evento requerido' },
        { status: 400 }
      );
    }

    let data = null;

    switch (type) {
      case 'propina':
        data = await getPropinaDetail(id);
        break;
      case 'comision':
        data = await getComisionDetail(id);
        break;
      case 'asistencia':
        data = await getAsistenciaDetail(id);
        break;
      case 'anticipo':
        data = await getAnticipoDetail(id);
        break;
      case 'servicio':
        data = await getServicioDetail(id);
        break;
      case 'venta':
        data = await getVentaDetail(id);
        break;
      case 'gratificacion':
        data = await getGratificacionDetail(id);
        break;
      case 'hora_extra':
        data = await getHoraExtraDetail(id);
        break;
      default:
        return NextResponse.json(
          { success: false, message: `Tipo no soportado: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true, data });
  }
);

async function getPropinaDetail(id: string) {
  // Obtener detalle de la propina
  const detalPropina = await query<any[]>(
    `
    SELECT 
      dp.id_detalle_propina,
      dp.monto,
      dp.estado,
      dp.fecha_crea,
      dp.usuario_id,
      p.id_propina,
      p.propina as monto_total,
      p.estado as estado_propina,
      p.fecha_crea as fecha_crea_propina,
      p.venta_id,
      v.codigo as codigo_venta,
      v.fecha_crea as fecha_venta,
      v.total as total_venta,
      v.metodo_pago,
      v.estado as estado_venta,
      v.habitacion_id,
      h.numero as habitacion_nombre
    FROM detalle_propinas dp
    INNER JOIN propinas p ON p.id_propina = dp.propina_id
    LEFT JOIN ventas v ON v.id_venta = p.venta_id
    LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
    WHERE dp.id_detalle_propina = ?
  `,
    [id]
  );

  if (detalPropina.length === 0) {
    return { message: 'Propina no encontrada', tipo: 'propina' };
  }

  const dp = detalPropina[0];

  // Obtener información del usuario que recibió la propina
  const usuario = await query<any[]>(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido, u.foto
    FROM usuarios u WHERE u.id_usuario = ?
  `,
    [dp.usuario_id]
  );

  // Obtener información del garzón (quién hizo la venta)
  let garzon = null;
  if (dp.venta_id) {
    const garzonData = await query<any[]>(
      `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido
      FROM detalle_ventas dv
      INNER JOIN usuarios u ON u.id_usuario = dv.usuario_id
      WHERE dv.venta_id = ? LIMIT 1
    `,
      [dp.venta_id]
    );
    if (garzonData.length > 0) garzon = garzonData[0];
  }

  // Obtener Cajero
  let cajero = null;
  if (dp.venta_id) {
    const cajeroData = await query<any[]>(
      `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido
      FROM ventas v2
      INNER JOIN usuarios u ON u.id_usuario = v2.cajero_id
      WHERE v2.id_venta = ?
    `,
      [dp.venta_id]
    );
    if (cajeroData.length > 0) cajero = cajeroData[0];
  }

  // Obtener detalles del pedido/venta
  let detalles: any[] = [];
  if (dp.venta_id) {
    detalles = await query<any[]>(
      `
      SELECT dv.cantidad, dv.sub_total as subtotal, p.nombre as producto_nombre
      FROM detalle_ventas dv
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE dv.venta_id = ?
    `,
      [dp.venta_id]
    );
  }

  // Obtener todas las propinas de esta venta (para mostrar cómo se dividió)
  let propinas_detalle: any[] = [];
  if (dp.venta_id) {
    propinas_detalle = await query<any[]>(
      `
      SELECT dp2.monto, u.id_usuario, u.nick, u.nombre, u.apellido
      FROM detalle_propinas dp2
      INNER JOIN propinas p2 ON p2.id_propina = dp2.propina_id
      INNER JOIN usuarios u ON u.id_usuario = dp2.usuario_id
      WHERE p2.venta_id = ?
    `,
      [dp.venta_id]
    );
  }

  // Obtener tiempo del servicio si aplica
  let tiempo = null;
  if (dp.venta_id) {
    const tiempoData = await query<any[]>(
      `
      SELECT TIMESTAMPDIFF(MINUTE, v.hora_inicio, v.hora_fin) as minutos
      FROM servicios v WHERE v.id_servicio = ?
    `,
      [dp.venta_id]
    );
    if (tiempoData.length > 0 && tiempoData[0].minutos) {
      tiempo = tiempoData[0].minutos;
    }
  }

  return {
    tipo: 'propina',
    monto: dp.monto,
    // Usuario que recibió
    usuario_nick: usuario[0]?.nick,
    usuario_nombre: usuario[0]?.nombre,
    // Datos de la venta
    habitacion_nombre: dp.habitacion_nombre,
    codigo: dp.codigo_venta,
    tiempo: tiempo,
    // Garzón y cajero
    garzon_nick: garzon?.nick,
    garzon_nombre: garzon?.nombre,
    cajero_nick: cajero?.nick,
    cajero_nombre: cajero?.nombre,
    // Productos
    detalles: detalles,
    // Propinas detalle (para admins)
    propinas_detalle: propinas_detalle,
    // Para anfitriona - anfitrionas
    anfitrionas: propinas_detalle.map((p: any) => ({
      nick: p.nick,
      nombre: p.nombre,
      comision: p.monto
    }))
  };
}

async function getComisionDetail(id: string) {
  // Obtener detalle de la comisión
  const detalComision = await query(
    `
    SELECT 
      dc.id_detalle_comision,
      dc.comision as comision,
      dc.estado,
      dc.fecha_crea,
      dc.usuario_id,
      c.id_comision,
      c.monto as monto_total,
      c.estado as estado_comision,
      c.venta_id,
      c.servicio_id,
      v.codigo as codigo_venta,
      v.fecha_crea as fecha_venta,
      v.total as total_venta,
      v.habitacion_id,
      h.nombre as habitacion_nombre,
      s.codigo as codigo_servicio,
      s.fecha_crea as fecha_servicio,
      s.total as total_servicio,
      s.estado as estado_servicio,
      s.hora_inicio,
      s.hora_fin
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    LEFT JOIN ventas v ON v.id_venta = c.venta_id
    LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
    LEFT JOIN servicios s ON s.id_servicio = c.servicio_id
    WHERE dc.id_detalle_comision = ?
  `,
    [id]
  );

  if (detalComision.length === 0) {
    return { message: 'Comisión no encontrada', tipo: 'comision' };
  }

  const dc = detalComision[0];

  // Obtener información del usuario
  const usuario = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido, u.foto
    FROM usuarios u WHERE u.id_usuario = ?
  `,
    [dc.usuario_id]
  );

  // Es de venta o servicio?
  const esVenta = !!dc.venta_id;
  const esServicio = !!dc.servicio_id;

  // Obtener garzón y cajero
  let garzon = null,
    cajero = null;
  if (esVenta) {
    const garzonData = await query(
      `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido
      FROM detalle_ventas dv
      INNER JOIN usuarios u ON u.id_usuario = dv.usuario_id
      WHERE dv.venta_id = ? LIMIT 1
    `,
      [dc.venta_id]
    );
    if (garzonData.length > 0) garzon = garzonData[0];

    const cajeroData = await query(
      `
      SELECT u.id_usuario, u.nick, u.nombre, u.apellido
      FROM ventas v2
      INNER JOIN usuarios u ON u.id_usuario = v2.cajero_id
      WHERE v2.id_venta = ?
    `,
      [dc.venta_id]
    );
    if (cajeroData.length > 0) cajero = cajeroData[0];
  }

  // Tiempo del servicio
  let tiempo = null;
  if (esServicio && dc.hora_inicio && dc.hora_fin) {
    tiempo = Math.round(
      (new Date(dc.hora_fin).getTime() - new Date(dc.hora_inicio).getTime()) / 60000
    );
  }

  // Obtener detalles del pedido si es venta
  let detalles = [];
  if (esVenta) {
    detalles = await query(
      `
      SELECT dv.cantidad, dv.sub_total as subtotal, p.nombre as producto_nombre
      FROM detalle_ventas dv
      INNER JOIN productos p ON p.id_producto = dv.producto_id
      WHERE dv.venta_id = ?
    `,
      [dc.venta_id]
    );
  }

  return {
    tipo: 'comision',
    monto: dc.comision,
    // Usuario que recibió
    usuario_nick: usuario[0]?.nick,
    usuario_nombre: usuario[0]?.nombre,
    // Datos relacionados
    habitacion_nombre: esVenta ? dc.habitacion_nombre : null,
    codigo: esVenta ? dc.codigo_venta : dc.codigo_servicio,
    tiempo: tiempo,
    subType: esVenta ? 'venta' : esServicio ? 'servicio' : null,
    // Garzón y cajero
    garzon_nick: garzon?.nick,
    garzon_nombre: garzon?.nombre,
    cajero_nick: cajero?.nick,
    cajero_nombre: cajero?.nombre,
    // Productos
    detalles: detalles
  };
}

async function getAsistenciaDetail(id: string) {
  // La tabla correcta es "asistencias" (plural)
  const asistencia = await query(
    `
    SELECT 
      a.id_asistencia,
      a.fecha,
      a.hora,
      a.estado,
      u.id_usuario,
      u.nick,
      u.nombre,
      u.apellido,
      u.foto,
      u.sueldo,
      u.aporte,
      r.nombre as rol
    FROM asistencias a
    INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
    LEFT JOIN roles r ON r.id_rol = u.rol_id
    WHERE a.id_asistencia = ?
  `,
    [id]
  );

  if (asistencia.length === 0) {
    return { message: 'Asistencia no encontrada', tipo: 'asistencia' };
  }

  const a = asistencia[0];

  // Calcular liquidación
  const liquiSueldo = Number(a.sueldo || 0);
  const liquiAporte = Number(a.aporte || 0);

  // Obtener descuento de habitación si hay semanas
  const semanasData = await query(
    `
    SELECT COUNT(DISTINCT YEARWEEK(fecha, 1)) as semanas
    FROM asistencias
    WHERE usuario_id = ? AND fecha <= ? AND estado = 1 AND DAYOFWEEK(fecha) IN (3,4,5,6,7,1)
  `,
    [a.id_usuario, a.fecha]
  );

  // Si no hay datos de semanas, continuar con 0
  const semanas = semanasData.length > 0 ? Number(semanasData[0]?.semanas || 0) : 0;
  const descuento_total = 0; // Por ahora 0, ajustar según lógica de negocio
  const neto = liquiSueldo - liquiAporte - descuento_total;

  return {
    tipo: 'asistencia',
    // Datos del usuario
    usuario_nick: a.nick,
    usuario_nombre: a.nombre,
    // Liquidación
    sueldo: liquiSueldo,
    aporte: liquiAporte,
    descuento_total: descuento_total,
    semanas_con_descuento: semanas,
    neto: neto,
    // Fechas
    fecha: a.fecha,
    hora: a.hora
  };
}

async function getAnticipoDetail(id: string) {
  // Obtener detalle del anticipo
  const anticipo = await query(
    `
    SELECT 
      a.id_anticipo,
      a.monto,
      a.estado,
      a.fecha_crea,
      a.fecha_mod,
      a.observacion,
      a.usuario_id,
      u.id_usuario,
      u.nick,
      u.nombre,
      u.apellido,
      u.foto
    FROM anticipos a
    INNER JOIN usuarios u ON u.id_usuario = a.usuario_id
    WHERE a.id_anticipo = ?
  `,
    [id]
  );

  if (anticipo.length === 0) {
    return { message: 'Anticipo no encontrado', tipo: 'anticipo' };
  }

  const a = anticipo[0];

  // Obtener historial de aprobaciones
  const historial = await query(
    `
    SELECT h.accion, h.fecha_crea, u.nick as usuario_accion_nick
    FROM anticipo_historial h
    LEFT JOIN usuarios u ON u.id_usuario = h.usuario_id
    WHERE h.anticipo_id = ?
    ORDER BY h.fecha_crea DESC
  `,
    [id]
  );

  return {
    tipo: 'anticipo',
    // Solicitante
    solicitante_nick: a.nick,
    solicitante_nombre: a.nombre,
    // Datos
    monto: a.monto,
    estado: a.estado,
    observacion: a.observacion,
    // Fechas
    fecha: a.fecha_crea,
    // Historial
    historial: historial
  };
}

async function getServicioDetail(id: string) {
  // Obtener detalle del servicio
  const servicio = await query(
    `
    SELECT 
      s.id_servicio,
      s.codigo,
      s.fecha_crea,
      s.hora_inicio,
      s.hora_fin,
      s.total,
      s.metodo_pago,
      s.estado,
      s.observaciones,
      s.habitacion_id,
      s.cliente_id,
      h.numero as habitacion_nombre,
      c.nombre as cliente_nombre,
      c.telefono as cliente_telefono
    FROM servicios s
    LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
    LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
    WHERE s.id_servicio = ?
  `,
    [id]
  );

  if (servicio.length === 0) {
    return { message: 'Servicio no encontrado', tipo: 'servicio' };
  }

  const s = servicio[0];

  // Calcular tiempo
  let tiempo = null;
  if (s.hora_inicio && s.hora_fin) {
    tiempo = Math.round(
      (new Date(s.hora_fin).getTime() - new Date(s.hora_inicio).getTime()) / 60000
    );
  }

  // Obtener detalle de los productos
  const productos = await query(
    `
    SELECT 
      ds.cantidad,
      ds.sub_total,
      p.nombre as producto_nombre,
      u.id_usuario as usuario_id,
      u.nick as usuario_nick,
      u.nombre as usuario_nombre
    FROM detalle_servicios ds
    INNER JOIN productos p ON p.id_producto = ds.producto_id
    LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id
    WHERE ds.servicio_id = ?
  `,
    [id]
  );

  // Obtener comisiones
  const comisiones = await query(
    `
    SELECT 
      dc.monto as comision,
      u.id_usuario,
      u.nick,
      u.nombre,
      u.apellido
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
    WHERE c.servicio_id = ?
  `,
    [id]
  );

  // Obtener anfitrionas (usuarios con comisión en servicio)
  const anfitrionas = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido, dc.monto as comision
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
    WHERE c.servicio_id = ?
  `,
    [id]
  );

  // Obtener garzón (quien hizo el servicio)
  let garzon = null;
  const garzonData = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido
    FROM detalle_servicios ds
    INNER JOIN usuarios u ON u.id_usuario = ds.usuario_id
    WHERE ds.servicio_id = ? LIMIT 1
  `,
    [id]
  );
  if (garzonData.length > 0) garzon = garzonData[0];

  // Obtener cajero
  let cajero = null;
  const cajeroData = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido
    FROM servicios s2
    INNER JOIN usuarios u ON u.id_usuario = s2.cajero_id
    WHERE s2.id_servicio = ?
  `,
    [id]
  );
  if (cajeroData.length > 0) cajero = cajeroData[0];

  return {
    tipo: 'servicio',
    monto: s.total,
    // Datos
    codigo: s.codigo,
    tiempo: tiempo,
    habitacion_nombre: s.habitacion_nombre,
    cliente_nombre: s.cliente_nombre || 'Sin cliente',
    // Garzón y cajero
    garzon_nick: garzon?.nick,
    garzon_nombre: garzon?.nombre,
    cajero_nick: cajero?.nick,
    cajero_nombre: cajero?.nombre,
    // Productos
    detalles: productos.map((p: any) => ({
      cantidad: p.cantidad,
      producto_nombre: p.producto_nombre,
      subtotal: p.sub_total
    })),
    // Anfitrionas
    anfitrionas: anfitrionas,
    // Comisiones
    propinas_detalle: comisiones.map((c: any) => ({
      monto: c.comision,
      nick: c.nick,
      nombre: c.nombre,
      apellido: c.apellido
    }))
  };
}

async function getVentaDetail(id: string) {
  // Obtener detalle de la venta
  const venta = await query(
    `
    SELECT 
      v.id_venta,
      v.codigo,
      v.fecha_crea,
      v.total,
      v.propina,
      v.total_comision,
      v.metodo_pago,
      v.estado,
      v.observaciones,
      v.habitacion_id,
      v.cliente_id,
      h.numero as habitacion_nombre,
      c.nombre as cliente_nombre,
      c.telefono as cliente_telefono
    FROM ventas v
    LEFT JOIN habitaciones h ON h.id_habitacion = v.habitacion_id
    LEFT JOIN clientes c ON c.id_cliente = v.cliente_id
    WHERE v.id_venta = ?
  `,
    [id]
  );

  if (venta.length === 0) {
    return { message: 'Venta no encontrada', tipo: 'venta' };
  }

  const v = venta[0];

  // Obtener detalle de los productos
  const productos = await query(
    `
    SELECT 
      dv.cantidad,
      dv.sub_total,
      p.nombre as producto_nombre
    FROM detalle_ventas dv
    INNER JOIN productos p ON p.id_producto = dv.producto_id
    WHERE dv.venta_id = ?
  `,
    [id]
  );

  // Obtener comisiones
  const comisiones = await query(
    `
    SELECT 
      dc.monto as comision,
      u.id_usuario,
      u.nick,
      u.nombre,
      u.apellido
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
    WHERE c.venta_id = ?
  `,
    [id]
  );

  // Obtener propinas
  const propinas = await query(
    `
    SELECT 
      dp.monto,
      u.id_usuario,
      u.nick,
      u.nombre,
      u.apellido
    FROM detalle_propinas dp
    INNER JOIN propinas p ON p.id_propina = dp.propina_id
    INNER JOIN usuarios u ON u.id_usuario = dp.usuario_id
    WHERE p.venta_id = ?
  `,
    [id]
  );

  // Obtener garzón
  let garzon = null;
  const garzonData = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido
    FROM detalle_ventas dv
    INNER JOIN usuarios u ON u.id_usuario = dv.usuario_id
    WHERE dv.venta_id = ? LIMIT 1
  `,
    [id]
  );
  if (garzonData.length > 0) garzon = garzonData[0];

  // Obtener cajero
  let cajero = null;
  const cajeroData = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido
    FROM ventas v2
    INNER JOIN usuarios u ON u.id_usuario = v2.cajero_id
    WHERE v2.id_venta = ?
  `,
    [id]
  );
  if (cajeroData.length > 0) cajero = cajeroData[0];

  // Obtener anfitrionas
  const anfitrionas = await query(
    `
    SELECT u.id_usuario, u.nick, u.nombre, u.apellido, dc.monto as comision
    FROM detalle_comisiones dc
    INNER JOIN comisiones c ON c.id_comision = dc.comision_id
    INNER JOIN usuarios u ON u.id_usuario = dc.usuario_id
    WHERE c.venta_id = ?
  `,
    [id]
  );

  // Obtener tiempo si hay servicio relacionado
  let tiempo = null;
  const tiempoData = await query(
    `
    SELECT TIMESTAMPDIFF(MINUTE, s.hora_inicio, s.hora_fin) as minutos
    FROM servicios s
    INNER JOIN ventas v2 ON v2.pedido_id = s.id_servicio
    WHERE v2.id_venta = ?
  `,
    [id]
  );
  if (tiempoData.length > 0 && tiempoData[0].minutos) {
    tiempo = tiempoData[0].minutos;
  }

  return {
    tipo: 'venta',
    monto: v.total,
    // Datos
    codigo: v.codigo,
    tiempo: tiempo,
    habitacion_nombre: v.habitacion_nombre,
    cliente_nombre: v.cliente_nombre || 'Sin cliente',
    observaciones: v.observaciones,
    // Garzón y cajero
    garzon_nick: garzon?.nick,
    garzon_nombre: garzon?.nombre,
    cajero_nick: cajero?.nick,
    cajero_nombre: cajero?.nombre,
    // Productos
    detalles: productos.map((p: any) => ({
      cantidad: p.cantidad,
      producto_nombre: p.producto_nombre,
      subtotal: p.sub_total
    })),
    // Anfitrionas
    anfitrionas: anfitrionas,
    // Propinas y comisiones
    propinas_detalle: propinas.map((p: any) => ({
      monto: p.monto,
      nick: p.nick,
      nombre: p.nombre,
      apellido: p.apellido
    }))
  };
}

async function getGratificacionDetail(id: string) {
  const gratificacion = await query(
    `
    SELECT 
      g.id,
      g.monto,
      g.descripcion,
      g.estado,
      g.fecha_crea,
      g.usuario_id,
      u.nick,
      u.nombre,
      u.apellido,
      u.foto
    FROM gratificaciones g
    INNER JOIN usuarios u ON u.id_usuario = g.usuario_id
    WHERE g.id = ?
  `,
    [id]
  );

  if (gratificacion.length === 0) {
    return { message: 'Gratificación no encontrada', tipo: 'gratificacion' };
  }

  const g = gratificacion[0];

  return {
    tipo: 'gratificacion',
    monto: g.monto,
    descripcion: g.descripcion,
    usuario_nick: g.nick,
    usuario_nombre: g.nombre,
    fecha: g.fecha_crea,
    estado: g.estado
  };
}

async function getHoraExtraDetail(id: string) {
  const horaExtra = await query(
    `
    SELECT 
      he.id_hora_extra,
      he.hora,
      he.total,
      he.estado,
      he.fecha_crea,
      he.observaciones,
      he.usuario_id,
      u.nick,
      u.nombre,
      u.apellido,
      u.foto
    FROM horas_extras he
    INNER JOIN usuarios u ON u.id_usuario = he.usuario_id
    WHERE he.id_hora_extra = ?
  `,
    [id]
  );

  if (horaExtra.length === 0) {
    return { message: 'Hora extra no encontrada', tipo: 'hora_extra' };
  }

  const he = horaExtra[0];

  return {
    tipo: 'hora_extra',
    monto: he.total,
    hora: he.hora,
    observaciones: he.observaciones,
    usuario_nick: he.nick,
    usuario_nombre: he.nombre,
    fecha: he.fecha_crea,
    estado: he.estado
  };
}
