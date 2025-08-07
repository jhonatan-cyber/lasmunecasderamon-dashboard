import { NextApiRequest, NextApiResponse } from "next";
import { withAuth } from "@/lib/middleware/auth";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // @ts-ignore
  const user = req.user;
  
  return res.status(200).json({ 
    success: true,
    message: "Autenticación exitosa",
    user: {
      id: user?.id,
      username: user?.username,
      role: user?.role
    }
  });
}

export default withAuth(handler); 