import { NextApiRequest, NextApiResponse } from "next";
import { query } from "@/lib/db";
import { withAuth } from "@/lib/middleware/auth";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Método no permitido",
    });
  }

  try {
    // Cerrar todas las sesiones activas (estado 1 -> 0)
    const result = await query(
      "UPDATE logins SET estado = 0, fecha_logout = NOW() WHERE estado = 1"
    );

    return res.status(200).json({
      success: true,
      message: "Todas las sesiones han sido cerradas exitosamente",
      data: { sesionesCerradas: result.affectedRows || 0 },
    });
  } catch (error) {
    console.error("Error al cerrar sesiones:", error);
    return res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export default withAuth(handler); 