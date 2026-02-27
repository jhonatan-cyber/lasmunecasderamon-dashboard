import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { enviarMensajeDevolucionServicio } from "@/lib/whatsappService";
import { withAuth } from "@/lib/middleware/auth";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }



  // Obtener usuario logueado
  // @ts-ignore
  const usuarioLogueado = req.user;



  // Obtener nombre completo del usuario desde la base de datos
  let nombreCompleto = "Usuario del Sistema";
  if (usuarioLogueado && usuarioLogueado.id) {
    try {
      const usuarioSql = `
        SELECT CONCAT(nombre, " ", apellido) as nombre_completo
        FROM usuarios 
        WHERE id_usuario = ?
      `;
      const usuarioResult = await query(usuarioSql, [usuarioLogueado.id]);
      if (Array.isArray(usuarioResult) && usuarioResult.length > 0) {
        nombreCompleto = (usuarioResult[0] as any).nombre_completo || "Usuario del Sistema";
      }
    } catch (error) {

      nombreCompleto = usuarioLogueado.nick || "Usuario del Sistema";
    }
  }

  const { id } = req.query;
  const servicioId = parseInt(id as string);

  if (isNaN(servicioId)) {
    return res.status(400).json({ error: "ID de servicio inválido" });
  }

  try {
    const { motivo } = req.body;

    // Validar que el servicio existe y obtener información
    const servicioSql = `
      SELECT 
        s.*,
        COALESCE(CONCAT(c.nombre, ' ', c.apellido), 'Sin cliente registrado') as cliente_nombre,
        h.nombre as habitacion_numero,
        GROUP_CONCAT(u.nick SEPARATOR ', ') as anfitrionas_nombres
      FROM servicios s
      LEFT JOIN clientes c ON s.cliente_id = c.id_cliente
      LEFT JOIN habitaciones h ON s.habitacion_id = h.id_habitacion
      LEFT JOIN detalle_servicios ds ON s.id_servicio = ds.servicio_id
      LEFT JOIN usuarios u ON ds.usuario_id = u.id_usuario
      WHERE s.id_servicio = ?
      GROUP BY s.id_servicio
    `;

    const servicioResult = await query(servicioSql, [servicioId]);
    if (!Array.isArray(servicioResult) || servicioResult.length === 0) {
      return res.status(404).json({ error: "Servicio no encontrado" });
    }

    const servicio = servicioResult[0] as any;

    // Verificar que el servicio no esté ya anulado o con solicitud pendiente
    if (servicio.estado === 0 || servicio.estado === 4) {
      return res.status(400).json({
        error: servicio.estado === 0
          ? "El servicio ya está anulado"
          : "El servicio ya tiene una solicitud de anulación pendiente"
      });
    }

    // Preparar datos de anfitrionas
    const anfitrionas = servicio.anfitrionas_nombres
      ? servicio.anfitrionas_nombres.split(', ').filter((nombre: string) => nombre.trim())
      : [];

    // Usar el nombre completo del usuario logueado
    const usuarioNombre = nombreCompleto;

    // Actualizar estado a solicitud de anulación (estado = 4)
    await query(
      "UPDATE servicios SET estado = 4, fecha_mod = NOW() WHERE id_servicio = ?",
      [servicioId]
    );

    // Generar token único para esta solicitud
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // Guardar token en la base de datos (crear tabla si no existe)
    try {
      // Crear tabla si no existe
      await query(
        `CREATE TABLE IF NOT EXISTS solicitudes_anulacion_servicios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          servicio_id INT NOT NULL,
          token VARCHAR(255) UNIQUE NOT NULL,
          estado ENUM('pendiente', 'confirmada', 'rechazada') DEFAULT 'pendiente',
          fecha_solicitud TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (servicio_id) REFERENCES servicios(id_servicio) ON DELETE CASCADE
        )`
      );

      // Agregar columnas si no existen
      try {
        await query("ALTER TABLE solicitudes_anulacion_servicios ADD COLUMN solicitado_por VARCHAR(255) DEFAULT 'Usuario del Sistema'");
      } catch (error) {
        // La columna ya existe, ignorar error
      }

      try {
        await query("ALTER TABLE solicitudes_anulacion_servicios ADD COLUMN motivo VARCHAR(500) DEFAULT 'Motivo no especificado'");
      } catch (error) {
        // La columna ya existe, ignorar error
      }

      await query(
        "INSERT INTO solicitudes_anulacion_servicios (servicio_id, token, solicitado_por, motivo) VALUES (?, ?, ?, ?)",
        [servicioId, token, usuarioNombre, motivo]
      );
    } catch (error) {
      console.error("Error al guardar token:", error);
    }

    // Obtener número de WhatsApp del administrador
    const adminWhatsApp = process.env.ADMIN_WHATSAPP_NUMBER?.replace('whatsapp:', '') || "59172419112";
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"; // URL de ngrok

    // Enviar mensaje WhatsApp usando el servicio
    try {
      await enviarMensajeDevolucionServicio({
        numeroAdmin: adminWhatsApp,
        codigoServicio: servicio.codigo,
        clienteNombre: servicio.cliente_nombre || 'Sin cliente',
        total: servicio.total || 0,
        fechaServicio: new Date(servicio.fecha_crea).toLocaleDateString(),
        motivo: motivo,
        solicitadoPor: usuarioNombre,
        habitacion: servicio.habitacion_numero,
        tiempo: servicio.tiempo,
        anfitrionas: anfitrionas,
        token: token,
        baseUrl: baseUrl
      });
    } catch (whatsappError) {
      console.error("Error al enviar WhatsApp:", whatsappError);
      // No fallar la operación si WhatsApp falla
    }

    return res.status(200).json({
      success: true,
      message: "Solicitud de anulación enviada correctamente",
      servicio: {
        id: servicioId,
        codigo: servicio.codigo,
        estado: 4
      }
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
}

export default withAuth(handler); 