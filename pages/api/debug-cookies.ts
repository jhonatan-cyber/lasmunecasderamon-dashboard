import type { NextApiRequest, NextApiResponse } from 'next';
import Cookies from 'cookies';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('🚀 Debug cookies handler started');
  
  const cookies = new Cookies(req, res);
  
  // Obtener todas las cookies
  const allCookies = req.headers.cookie;
  const tokenCookie = cookies.get('token');
  
  console.log('📊 All cookies:', allCookies);
  console.log('📊 Token cookie:', tokenCookie);
  
  // Información del request
  const requestInfo = {
    method: req.method,
    url: req.url,
    headers: {
      'user-agent': req.headers['user-agent'],
      'referer': req.headers.referer,
      'origin': req.headers.origin,
      'host': req.headers.host,
    },
    cookies: {
      all: allCookies,
      token: tokenCookie,
    }
  };
  
  console.log('📊 Request info:', requestInfo);
  
  return res.status(200).json({
    success: true,
    message: 'Debug cookies info',
    data: {
      hasToken: !!tokenCookie,
      tokenLength: tokenCookie ? tokenCookie.length : 0,
      allCookies: allCookies,
      tokenCookie: tokenCookie,
      requestInfo: requestInfo
    }
  });
}
