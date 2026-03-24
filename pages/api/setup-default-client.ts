import type { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const existingClient = (await query(
      'SELECT id_cliente, nombre, apellido FROM clientes WHERE id_cliente = 1'
    )) as Array<{ id_cliente: number; nombre: string; apellido: string }>;

    if (existingClient.length > 0) {
      return res.status(200).json({
        success: true,
        message: 'Cliente por defecto ya existe',
        cliente: existingClient[0],
      });
    }

    const now = getNowInBusinessTimezone();
    await query(
      `INSERT INTO clientes (id_cliente, nombre, apellido, run, email, telefono, estado, fecha_creacion) 
       VALUES (1, 'Cliente', 'Generico', '00000000-0', 'cliente@generico.com', '+56900000000', 1, ?)`
    , [now]);

    return res.status(201).json({
      success: true,
      message: 'Cliente por defecto creado exitosamente',
      cliente: {
        id_cliente: 1,
        nombre: 'Cliente',
        apellido: 'Generico',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido',
    });
  }
}
