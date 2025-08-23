import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: number;
  userId: number;
  username: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

// Función para verificar y decodificar un token JWT
export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as AuthenticatedUser;
    
    return decoded;
  } catch (error) {
    console.error('Error verificando token:', error);
    return null;
  }
}

// Función para generar un token JWT
export function generateToken(userData: {
  id: number;
  username: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: userData.id,
      userId: userData.id, // Para compatibilidad
      username: userData.username,
      email: userData.email,
      role: userData.role
    },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}

// Función para extraer token de diferentes fuentes
export function extractToken(req: any): string | null {
  // Buscar en el header Authorization
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.replace('Bearer ', '');
  }

  // Buscar en cookies
  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}
