/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      // Consulta simplificada para obtener usuarios activos
      const results = (await query(`
        SELECT 
          U.id_usuario,
          U.run,
          U.nick,
          U.nombre,
          U.apellido,
          U.direccion,
          U.telefono,
          U.estado_civil,
          U.afp,
          U.aporte,
          U.descuento,
          U.sueldo,
          U.email,
          R.nombre as rol,
          U.foto,
          U.estado,
          U.fecha_crea,
          U.fecha_mod,
          U.fecha_baja
        FROM usuarios U
        INNER JOIN roles R ON R.id_rol = U.rol_id
        WHERE U.estado = 1
        ORDER BY U.nombre, U.apellido
      `)) as any[];

      // Filtrar garzones, cajeros, meseros y anfitrionas en JavaScript
      const garzones = results.filter((user: any) => {
        const roleLower = user.rol?.toLowerCase() || '';
        return roleLower.includes('garzon') || roleLower.includes('mesero') || roleLower.includes('cajero') || roleLower.includes('anfitriona');
      });

      // Mapear los resultados al formato esperado
      const garzonesMapeados = garzones.map((user: any) => ({
        id: user.id_usuario,
        run: user.run || '',
        nick: user.nick,
        name: user.nombre,
        lastName: user.apellido,
        address: user.direccion,
        phone: user.telefono,
        maritalStatus: user.estado_civil,
        afp: user.afp,
        contributions: user.aporte,
        discount: user.descuento,
        salary: user.sueldo,
        email: user.email,
        role: user.rol,
        foto: user.foto,
        status: user.estado,
        created_at: user.fecha_crea,
        updated_at: user.fecha_mod,
        deleted_at: user.fecha_baja,
        housing_discount: false // Valor por defecto ya que la columna no existe
      }));

      return res.status(200).json({
        success: true,
        data: garzonesMapeados
      });
    } catch (error) {
      console.error('Error al obtener garzones:', error);
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

