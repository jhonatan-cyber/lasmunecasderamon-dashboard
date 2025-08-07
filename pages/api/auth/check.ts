import type { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";

function handler(req: NextApiRequest, res: NextApiResponse) {
  // Si llega aquí, el usuario está autenticado
  return res.status(200).json({ success: true, message: "Autenticado" });
}

export default withAuth(handler); 