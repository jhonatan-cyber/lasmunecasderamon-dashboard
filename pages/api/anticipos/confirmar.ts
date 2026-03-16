import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { token } = req.query;

  if (!token) {
    return res.status(400).send('Token no válido');
  }

  // Redirigir a la página de confirmación de anticipo
  res.redirect(`/confirmar-anticipo?token=${token}`);
}
