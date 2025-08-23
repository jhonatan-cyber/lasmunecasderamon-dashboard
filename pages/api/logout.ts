import type { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

// Función simple para verificar token
const verifyToken = (token: string) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
  } catch (error) {
    return null;
  }
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cookies = new Cookies(req, res);
  
  try {
    // Obtener token desde cookies
    const token = cookies.get('token');
    
    if (token) {
      // Decodificar token para obtener el userId
      const decoded = verifyToken(token) as any;
      
      if (decoded && decoded.id) {
        const userId = decoded.id;
        const userRole = decoded.role?.toLowerCase() || '';
        
        console.log(`🔓 [LOGOUT] Cerrando sesión para usuario ${userId} (${userRole})`);
        
        // Solo desactivar logins para garzones y anfitrionas
        const rolesConLogin = ['garzon', 'anfitriona'];
        
        if (rolesConLogin.includes(userRole)) {
          console.log(`🔄 [LOGOUT] Desactivando login para ${userRole}`);
          
          // Desactivar el login activo del usuario (estado = 0)
          await query(
            'UPDATE logins SET estado = 0 WHERE usuario_id = ? AND estado = 1 AND DATE(last_login) = CURDATE()',
            [userId]
          );
          
          console.log(`✅ [LOGOUT] Login desactivado para usuario ${userId}`);
        } else {
          console.log(`ℹ️ [LOGOUT] Rol ${userRole} no requiere desactivación de login`);
        }
      }
    }
  } catch (error) {
    console.error('❌ [LOGOUT] Error al desactivar login:', error);
    // Continuar con el logout aunque haya error en la base de datos
  }
  
  // Limpiar cookie
  cookies.set("token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  
  return res.status(200).json({ success: true, message: "Sesión cerrada" });
} 