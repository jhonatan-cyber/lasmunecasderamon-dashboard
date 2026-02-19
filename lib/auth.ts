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

export function verifyToken(token: string): AuthenticatedUser | null {
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'default_secret'
    ) as AuthenticatedUser;
    
    return decoded;
  } catch (error) {
   
    return null;
  }
}

export function generateToken(userData: {
  id: number;
  username: string;
  email: string;
  role: string;
}): string {
  return jwt.sign(
    {
      id: userData.id,
      userId: userData.id, 
      username: userData.username,
      email: userData.email,
      role: userData.role
    },
    process.env.JWT_SECRET || 'default_secret',
    { expiresIn: '24h' }
  );
}

export function extractToken(req: any): string | null {
  const auth = req.headers?.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    return auth.replace('Bearer ', '');
  }

  if (req.cookies?.token) {
    return req.cookies.token;
  }

  return null;
}
