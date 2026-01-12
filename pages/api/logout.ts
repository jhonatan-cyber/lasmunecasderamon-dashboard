import type { NextApiRequest, NextApiResponse } from "next";
import Cookies from "cookies";
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { clearCookie } from '@/lib/middleware/cookieUtils';

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
        
    
        
        // Solo desactivar logins para garzones y anfitrionas
        const rolesConLogin = ['garzon', 'anfitriona'];
        
        if (rolesConLogin.includes(userRole)) {
          
          
          // Desactivar el login activo del usuario (estado = 0)
          await query(
            'UPDATE logins SET estado = 0 WHERE usuario_id = ? AND estado = 1 AND DATE(last_login) = CURDATE()',
            [userId]
          );
          
      
        } 
      }
    }
  } catch (error) {
    console.error('❌ [LOGOUT] Error al desactivar login:', error);
    // Continuar con el logout aunque haya error en la base de datos
  }
  
  // Limpiar cookie de forma robusta
  clearCookie(req, res, 'token');
  // Adicionalmente, intentar limpiar cualquier variante remanente del cookie
  try {
    cookies.set('token', '', { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 0 });
    cookies.set('token', '', { httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 0 });
  } catch {}
  
  return res.status(200).json({ success: true, message: "Sesión cerrada" });
} 