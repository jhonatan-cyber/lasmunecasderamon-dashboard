import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Auth check simple handler started');
  console.log('📊 Request method:', req.method);
  console.log('📊 Request headers:', req.headers);
  
  if (req.method !== 'GET') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('✅ Method validation passed');

  let token = null;
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
  
  console.log('📊 Client IP:', clientIP);
  
  // 1. Buscar en el header Authorization
  const auth = req.headers.authorization;
  if (auth && auth.startsWith("Bearer ")) {
    token = auth.replace("Bearer ", "");
    console.log('🔍 Token found in Authorization header');
  }
  
  // 2. Si no hay token, buscar en la cookie 'token'
  if (!token) {
    const cookies = new Cookies(req, res);
    const cookieToken = cookies.get('token');
    if (cookieToken) {
      token = cookieToken;
      console.log('🔍 Token found in cookie');
    } else {
      console.log('❌ No token found in headers or cookies');
    }
  }
  
  if (!token) {
    console.log('❌ No token provided');
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
  
  console.log('🔍 Token found, attempting to verify...');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as any;
    console.log('✅ Token verified successfully');
    console.log('📊 Decoded token:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      exp: decoded.exp
    });
    
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
    console.error('❌ Token verification failed:', err);
    console.error('❌ Error details:', {
      message: err instanceof Error ? err.message : 'Unknown error',
      name: err instanceof Error ? err.name : 'Unknown'
    });
    
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
