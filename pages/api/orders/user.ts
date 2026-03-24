import { NextApiRequest, NextApiResponse } from 'next';
import { withAuth } from '@/lib/middleware/auth';
import db from '@/lib/db';

type AuthenticatedOrderRequest = NextApiRequest & {
  user?: {
    id?: string | number;
  };
};

async function handler(req: AuthenticatedOrderRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Metodo no permitido' });
  }

  try {
    const user = req.user;
    if (!user?.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const orders = await db.query(
      `
  SELECT 
    P.id_pedido,
    CONCAT(CL.nombre, ' ', CL.apellido) AS cliente,
    P.codigo,
    CONCAT(U.nombre, ' ', U.apellido) AS garzon,
    (
        SELECT GROUP_CONCAT(U2.nick SEPARATOR ', ')
        FROM pedidos_usuarios PU
        INNER JOIN usuarios U2 ON U2.id_usuario = PU.usuario_id
        WHERE PU.pedido_id = P.id_pedido
    ) AS nicks,
    P.subtotal,
    P.total,
    P.estado,
    P.fecha_crea,
    P.fecha_mod
    FROM pedidos P
LEFT JOIN clientes CL ON CL.id_cliente = P.cliente_id
LEFT JOIN usuarios U ON U.id_usuario = P.mesero_id
WHERE P.mesero_id = ?
ORDER BY P.fecha_crea DESC;
      `,
      [user.id]
    );

    return res.status(200).json({
      success: true,
      data: orders,
    });
  } catch {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
}

export default withAuth(handler);
