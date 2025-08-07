import type { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);
  cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res.status(200).json({ success: true, message: "Sesión cerrada" });
} 