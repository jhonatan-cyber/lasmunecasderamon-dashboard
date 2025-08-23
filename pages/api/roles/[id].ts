import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";
import { query } from "@/lib/db";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id, action } = req.query;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "ID de rol requerido"
    });
  }

  if (req.method === "PUT") {
    try {
      let newStatus;
      let message;

      if (action === "activate") {
        newStatus = 1;
        message = "Rol activado correctamente";
      } else if (action === "deactivate") {
        newStatus = 0;
        message = "Rol desactivado correctamente";
      } else {
        return res.status(400).json({
          success: false,
          message: "Acción no válida. Use 'activate' o 'deactivate'"
        });
      }

      await query(
        "UPDATE roles SET estado = ?, fecha_mod = NOW() WHERE id_rol = ?",
        [newStatus, id]
      );

      return res.status(200).json({
        success: true,
        message: message
      });
    } catch (error) {
      console.error('Error al cambiar estado del rol:', error);
      return res.status(500).json({
        success: false,
        message: "Error al cambiar el estado del rol"
      });
    }
  }

  return res.status(405).json({
    success: false,
    message: `Método ${req.method} no permitido`
  });
}

export default withAuth(handler);
