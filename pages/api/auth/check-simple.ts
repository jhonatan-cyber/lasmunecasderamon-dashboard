/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let token = null;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  // 1. Buscar en el header Authorization
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    token = auth.replace("Bearer ", "");
  }
  
  // 2. Si no hay token, buscar en la cookie 'token'
  if (!token) {
    const cookies = new Cookies(req, res);
    const cookieToken = cookies.get('token');
    if (cookieToken) {
      token = cookieToken;
    }
  }
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Token no proporcionado",
      code: 'NO_TOKEN',
      debug: {
        hasAuthHeader: !!auth,
        hasCookie: !!req.cookies?.token,
        clientIP
      }
    });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as any;
    
    return res.status(200).json({ 
      success: true, 
      message: "Autenticado",
      user: {
        id: decoded.id,
        username: decoded.username,
        email: decoded.email,
        role: decoded.role
      },
      debug: {
        tokenLength: token.length,
        clientIP
      }
    });
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      message: "Token inválido o expirado",
      code: 'INVALID_TOKEN',
      debug: {
        tokenLength: token.length,
        clientIP,
        error: err instanceof Error ? err.message : 'Unknown error'
      }
    });
  }
}

