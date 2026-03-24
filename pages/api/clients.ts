/* eslint-disable */
import type { NextApiRequest, NextApiResponse } from 'next';
import { query, generateUUID } from '@/lib/db';
import { getNowInBusinessTimezone } from '@/lib/timezoneService';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method, query: queryParams, body } = req;
    switch (method) {
      case 'GET': {
        if (queryParams.id) {
          const id = queryParams.id as string;
          const clients = (await query(`
            SELECT c.*, 
            COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
            FROM clientes c 
            WHERE c.id_cliente = ?`, [
            id
          ])) as any[];

          if (clients.length === 0) {
            return res.status(404).json({ message: 'Cliente no encontrado' });
          }
          const client = clients[0];
          return res.status(200).json({
            id: client.id_cliente,
            run: client.run,
            name: client.nombre,
            lastName: client.apellido,
            phone: client.telefono,
            saldo: client.saldo || 0,
            deuda: client.deuda || 0,
            created_at: client.fecha_crea,
            updated_at: client.fecha_mod,
            status: client.estado
          });
        } else {
          const clients = (await query(`
            SELECT c.*, 
            COALESCE((SELECT SUM(total) FROM cuentas WHERE cliente_id = c.id_cliente AND estado = 1), 0) as deuda
            FROM clientes c 
            ORDER BY c.nombre ASC`)) as any[];
          const formattedClients = clients.map(client => ({
            id: client.id_cliente,
            run: client.run,
            name: client.nombre,
            lastName: client.apellido,
            phone: client.telefono,
            saldo: client.saldo || 0,
            deuda: client.deuda || 0,
            created_at: client.fecha_crea,
            updated_at: client.fecha_mod,
            status: client.estado
          }));

          return res.status(200).json(formattedClients);
        }
      }

      case 'POST': {
        const { run = '', name, lastName, phone = '' } = body;
        if (!name || !lastName) {
          return res.status(400).json({ message: 'Faltan parámetros requeridos' });
        }
        const id = generateUUID();
        const now = getNowInBusinessTimezone();
        await query(
          'INSERT INTO clientes (id_cliente, run, nombre, apellido, telefono, fecha_crea) VALUES (?, ?, ?, ?, ?, ?)',
          [id, run || '', name, lastName, phone || '', now]
        );
 
        return res.status(201).json({
          message: 'Cliente creado correctamente',
          id: id
        });
      }

      case 'PUT': {
        const { run, name, lastName, phone, id } = body;
        if (!id || !name || !lastName) {
          return res.status(400).json({ message: 'Faltan parámetros requeridos' });
        }
        const now = getNowInBusinessTimezone();
        await query(
          'UPDATE clientes SET run = ?, nombre = ?, apellido = ?, telefono = ?, fecha_mod = ? WHERE id_cliente = ?',
          [run, name, lastName, phone, now, id]
        );
        return res.status(200).json({ message: 'Cliente actualizado correctamente' });
      }

      case 'DELETE': {
        const { id } = queryParams;
        if (!id || Array.isArray(id)) {
          return res.status(400).json({ message: 'ID de cliente no válido' });
        }
        try {
          await query('DELETE FROM clientes WHERE id_cliente = ?', [id]);
          return res.status(200).json({ message: 'Cliente eliminado correctamente' });
        } catch (error) {
          return res.status(500).json({ message: 'Error al eliminar el cliente' });
        }
      }
    }
  } catch (error) {
    return res.status(500).json({
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}

