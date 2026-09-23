import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/api/withRoute';
import { AnticipoService } from '@/lib/services/AnticipoService';
import { query } from '@/lib/database/db';
import { ValidationError } from '@/lib/errors/errors';

export const GET = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'read' },
  async (_request: Request, { user }: { params: any; user: any }) => {
    const solicitudes = await query(
      `SELECT A.*, (CAST(U.nombre AS text) || CAST(' ' AS text) || CAST(U.apellido AS text)) AS usuario_nombre, U.nick
     FROM anticipos A
     INNER JOIN usuarios U ON U.id_usuario = A.usuario_id
     WHERE A.usuario_id = ? AND A.estado IN (1, 2, 3)
     ORDER BY A.fecha_crea DESC`,
      [user.id.toString()]
    );
    return NextResponse.json({ success: true, data: solicitudes });
  }
);

export const POST = withRoute(
  { auth: true, audit: true, module: 'advances', action: 'write' },
  async (request: Request, { user }: { params: any; user: any }) => {
    const body = await request.json();
    const { monto, motivo } = body;

    if (!monto || !motivo)
      throw new ValidationError('monto y motivo son requeridos', { monto, motivo });

    const result = await AnticipoService.request(user.id.toString(), Number(monto), motivo);
    return NextResponse.json(
      { success: true, message: 'Solicitud enviada', data: result },
      { status: 201 }
    );
  }
);
