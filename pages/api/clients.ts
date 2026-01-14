import type { NextApiRequest, NextApiResponse } from 'next';
import { 
  addClient, 
  getAllClients, 
  getClientById, 
  updateClient, 
  deleteClient 
} from '@/lib/procedures';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('[CLIENTS API] Method:', req.method, 'Query:', req.query);
    const { method, query: queryParams, body } = req;
    switch (method) {
      case 'GET': {
        console.log('[CLIENTS API] Getting clients...');
        if (queryParams.id) {
          const id = parseInt(queryParams.id as string);
          const results = (await getClientById(id)) as any[];
          const clients = Array.isArray(results) ? results : [results];
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
            created_at: client.fecha_crea,
            updated_at: client.fecha_mod,
            status: client.estado
          });
        } else {
          const results = (await getAllClients()) as any[];
          console.log('[CLIENTS API] Raw results:', results);
          const clients = Array.isArray(results) ? results : [results];
          console.log('[CLIENTS API] Clients array length:', clients.length);
          const formattedClients = clients.map(client => ({
            id: client.id_cliente,
            run: client.run,
            name: client.nombre,
            lastName: client.apellido,
            phone: client.telefono,
            created_at: client.fecha_crea,
            updated_at: client.fecha_mod,
            status: client.estado
          }));
          console.log('[CLIENTS API] Formatted clients:', formattedClients.length);
          return res.status(200).json(formattedClients);
        }
      }

      case 'POST': {
        const { run = '', name, lastName, phone = '' } = body;
        if (!name || !lastName) {
          return res.status(400).json({ message: 'Faltan parámetros requeridos' });
        }
        const result = await addClient(run, name, lastName, phone);
        return res.status(201).json({ 
          message: 'Cliente creado correctamente', 
          id: (result as any).insertId 
        });
      }

      case 'PUT': {
        const { run, name, lastName, phone, id } = body;
        if (!id || !name || !lastName) {
          return res.status(400).json({ message: 'Faltan parámetros requeridos' });
        }
        await updateClient(run, name, lastName, phone, id);
        return res.status(200).json({ message: 'Cliente actualizado correctamente' });
      }

      case 'DELETE': {
        const { id } = queryParams;
        if (!id || Array.isArray(id)) {
          return res.status(400).json({ message: 'ID de cliente no válido' });
        }
        try {
          await deleteClient(parseInt(id as string));
          return res.status(200).json({ message: 'Cliente eliminado correctamente' });
        } catch (error) {
          return res.status(500).json({ message: 'Error al eliminar el cliente' });
        }
      }
    }
  } catch (error) {
    console.error('[CLIENTS API] Error:', error);
    return res.status(500).json({
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}
