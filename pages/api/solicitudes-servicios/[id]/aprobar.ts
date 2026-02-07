import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { withAuth } from '@/lib/middleware/auth';
import { sendNotificationToAll } from '../../notifications/sse';

// Función para generar código único
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { id } = req.query;
    const { habitacion_id: habitacionIdOverride } = req.body || {};
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuario no autenticado' });
    }

    // Verificar que el usuario sea cajero o administrador
    const roleLower = (userRole || '').toLowerCase();
    if (roleLower !== 'cajero' && roleLower !== 'administrador') {
      return res.status(403).json({ 
        success: false, 
        message: 'No tienes permisos para aprobar solicitudes' 
      });
    }

    // Obtener la solicitud
    const solicitudes = await query(
      'SELECT * FROM solicitudes_servicios WHERE id_solicitud = ?',
      [id]
    ) as any[];

    if (solicitudes.length === 0) {
      return res.status(404).json({ success: false, message: 'Solicitud no encontrada' });
    }

    const solicitud = solicitudes[0];
    const habitacionIdFinal = habitacionIdOverride || solicitud.habitacion_id;

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ 
        success: false, 
        message: 'Esta solicitud ya ha sido procesada' 
      });
    }

    // Parsear anfitrionas_ids
    const anfitrionasIds = typeof solicitud.anfitrionas_ids === 'string' 
      ? JSON.parse(solicitud.anfitrionas_ids) 
      : solicitud.anfitrionas_ids;

    // Generar código único
    const codigo = generateUniqueCode();

    // Obtener caja abierta
    const cajaAbiertaResult = (await query(
      'SELECT id_caja FROM cajas WHERE estado = 1 ORDER BY fecha_apertura DESC LIMIT 1'
    )) as any[];
    const cajaId = cajaAbiertaResult && cajaAbiertaResult.length > 0 ? cajaAbiertaResult[0].id_caja : null;

    // Calcular sub_total, iva y total con las nuevas reglas
    const numAnfitrionas = anfitrionasIds.length;
    const numClientes = solicitud.num_clientes || 1;
    const tiempo = Number(solicitud.tiempo || 0);
    const multiplicador = tiempo === 60 ? 2 : 1;
    const tieneComision = (solicitud.comision_anfitriona || 0) > 0;
    
    // REGLA: Si tiene comisión, precio_servicio es 0
    const precioServicioBase = tieneComision ? 0 : (solicitud.precio_servicio || 0);
    const precioServicio = precioServicioBase * multiplicador;
    const precioHabitacionBase = solicitud.precio_habitacion || 0;
    
    // REGLA: Calcular precio habitación según reglas de comisión
    let precioHabitacionTotal;
    if (tieneComision) {
      // REGLA: Siempre multiplicar por número de clientes (sin importar anfitrionas)
      precioHabitacionTotal = precioHabitacionBase * Math.max(1, numClientes) * multiplicador;
    } else {
      // Lógica normal sin comisión
      precioHabitacionTotal = precioHabitacionBase * numAnfitrionas * multiplicador;
    }

    const subTotal = precioServicio * numAnfitrionas;

    // REGLA: Si tiene comisión, IVA es 0
    let ivaFinal = 0;
    let totalFinal = subTotal + precioHabitacionTotal;

    if (!tieneComision && solicitud.metodo_pago?.toLowerCase() === 'tarjeta') {
      ivaFinal = Math.floor(subTotal * 0.2);
      totalFinal = subTotal + precioHabitacionTotal + ivaFinal;
      const totalRedondeado = Math.ceil(totalFinal / 5000) * 5000;
      const excedente = totalRedondeado - totalFinal;
      ivaFinal = ivaFinal + excedente;
      totalFinal = totalRedondeado;
    }

    // REGLA: Calcular comisión dividida por anfitriona
    let comisionPorAnfitriona = 0;
    if (tieneComision && numAnfitrionas > 0) {
      // REGLA: La comisión SIEMPRE se divide entre el número de anfitrionas y se redondea hacia abajo
      comisionPorAnfitriona = Math.floor(solicitud.comision_anfitriona / numAnfitrionas);
    }

    // Crear el servicio
    const resultServicio = await query(
      `INSERT INTO servicios 
        (codigo, cliente_id, habitacion_id, precio_servicio, precio_habitacion, 
         iva, sub_total, total, tiempo, metodo_pago, caja_id, created_by, estado, fecha_crea) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
      [
        codigo,
        numClientes > 0 ? (solicitud.cliente_id || null) : null,
        habitacionIdFinal,
        precioServicio,
        precioHabitacionBase,
        ivaFinal,
        subTotal,
        totalFinal,
        solicitud.tiempo,
        solicitud.metodo_pago,
        cajaId,
        userId
      ]
    ) as any;

    const servicioId = resultServicio.insertId;

    // Insertar cliente en detalle_servicios_clientes si existe
    if (numClientes > 0 && solicitud.cliente_id) {
      await query(
        'INSERT INTO detalle_servicios_clientes (servicio_id, cliente_id) VALUES (?, ?)',
        [servicioId, solicitud.cliente_id]
      );
    }

    // Insertar anfitrionas en detalle_servicios con su comisión
    for (const anfitrionaId of anfitrionasIds) {
      await query(
        'INSERT INTO detalle_servicios (usuario_id, servicio_id, comision) VALUES (?, ?, ?)',
        [anfitrionaId, servicioId, comisionPorAnfitriona]
      );
    }

    // Actualizar el precio_servicio multiplicado por número de anfitrionas
    const nuevoPrecioServicio = precioServicio * numAnfitrionas;
    await query(
      'UPDATE servicios SET precio_servicio = ? WHERE id_servicio = ?',
      [nuevoPrecioServicio, servicioId]
    );

    // Actualizar la habitación como ocupada (estado = 2)
    await query(
      'UPDATE habitaciones SET estado = 2 WHERE id_habitacion = ?',
      [habitacionIdFinal]
    );

    // Actualizar la solicitud como aprobada
    await query(
      `UPDATE solicitudes_servicios 
       SET estado = 'aprobada', procesado_por = ?, fecha_procesamiento = NOW(), habitacion_id = ? 
       WHERE id_solicitud = ?`,
      [userId, habitacionIdFinal, id]
    );

    // Log de notificación al usuario que creó la solicitud
    console.log(`Solicitud #${id} aprobada. Usuario solicitante: ${solicitud.solicitado_por}`);

    // Obtener información completa del servicio para la notificación de timer
    const servicioCompleto = await query(
      `SELECT 
        s.id_servicio,
        s.codigo,
        s.habitacion_id,
        h.nombre as habitacion_nombre,
        s.tiempo,
        s.fecha_crea,
        s.cliente_id,
        c.nombre as cliente_nombre,
        GROUP_CONCAT(DISTINCT CONCAT(u.nombre, ' ', u.apellido) SEPARATOR ', ') as anfitrionas
      FROM servicios s
      LEFT JOIN habitaciones h ON h.id_habitacion = s.habitacion_id
      LEFT JOIN clientes c ON c.id_cliente = s.cliente_id
      LEFT JOIN detalle_servicios ds ON ds.servicio_id = s.id_servicio
      LEFT JOIN usuarios u ON u.id_usuario = ds.usuario_id AND u.rol_id = 3
      WHERE s.id_servicio = ?
      GROUP BY s.id_servicio`,
      [servicioId]
    ) as any[];

    // Enviar notificación SSE de actualización
    console.log('[APROBAR SOLICITUD] Enviando notificación SSE...');
    sendNotificationToAll('service_request_approved', {
      id_solicitud: id,
      servicio_id: servicioId,
      timestamp: new Date().toISOString()
    });

    // Enviar notificación de timer iniciado para sincronización
    if (servicioCompleto.length > 0) {
      const service = servicioCompleto[0];
      sendNotificationToAll('timer_started', {
        servicioId: service.id_servicio,
        codigo: service.codigo,
        roomId: service.habitacion_id,
        roomName: service.habitacion_nombre || `Habitación ${service.habitacion_id}`,
        duration: service.tiempo,
        startTime: service.fecha_crea,
        clienteNombre: numClientes > 0 ? (service.cliente_nombre || 'Cliente') : 'Cliente sin registrar',
        anfitrionas: service.anfitrionas || '',
        tipoTransaccion: 'servicio'
      });
      console.log('[APROBAR SOLICITUD] Notificación de timer_started enviada');
    }
    console.log('[APROBAR SOLICITUD] Notificación SSE enviada');

    return res.status(200).json({
      success: true,
      message: 'Solicitud aprobada y servicio creado exitosamente',
      data: { servicio_id: servicioId, codigo }
    });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    return res.status(500).json({ success: false, message: 'Error al aprobar solicitud' });
  }
};

export default withAuth(handler);
