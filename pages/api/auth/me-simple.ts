import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import Cookies from 'cookies';
import { query } from "@/lib/db";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Auth me simple handler started');
  console.log('📊 Request method:', req.method);
  
  if (req.method !== 'GET') {
    console.log('❌ Invalid method:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  console.log('✅ Method validation passed');

  let token = null;
  
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
      message: "No autenticado",
      code: 'NO_TOKEN'
    });
  }
  
  console.log('🔍 Token found, attempting to verify...');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_secret") as any;
    console.log('✅ Token verified successfully');
    console.log('📊 Decoded token:', {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    });

    // Obtener datos completos del usuario desde la base de datos
    console.log('🔍 Fetching user data from database...');
    const users = await query(
      `SELECT u.*, r.nombre as role_name 
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id_rol 
       WHERE u.id_usuario = ? AND u.estado = 1`,
      [decoded.id]
    ) as any[];

    console.log('📊 Database query completed');
    console.log('📊 Users found:', Array.isArray(users) ? users.length : 'Not an array');

    if (!Array.isArray(users) || users.length === 0) {
      console.log('❌ User not found in database');
      return res.status(404).json({ 
        success: false, 
        message: "Usuario no encontrado" 
      });
    }

    const user = users[0];
    console.log('✅ User found in database:', { id: user.id_usuario, email: user.email, role: user.role_name });
    
    // Formatear los datos del usuario para el frontend
    const userData = {
      id: user.id_usuario,
      name: user.nombre || user.username || "Usuario",
      lastName: user.apellido || "",
      email: user.email,
      role: user.role_name || decoded.role,
      status: user.estado,
      foto: user.foto,
      username: user.username
    };

    console.log('✅ User data formatted successfully');
    return res.status(200).json({ success: true, user: userData });
    
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
      error: err instanceof Error ? err.message : 'Unknown error'
    });
  }
}
