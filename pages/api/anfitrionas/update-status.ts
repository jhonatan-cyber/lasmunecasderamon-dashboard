import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método no permitido' });
  }

  try {
    const { 
      servicio_id, 
      anfitrionas_liberar = [], 
      anfitrionas_ocupar = [], 
      solo_visual = false 
    } = req.body;

    if (anfitrionas_liberar.length > 0) {
      const liberarIds = anfitrionas_liberar.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
      
      if (liberarIds.length > 0) {
        await query(
          `UPDATE usuarios SET estado_servicio = 1 WHERE id_usuario IN (${liberarIds.map(() => '?').join(',')})`,
          liberarIds
        );
      }
    }

    if (anfitrionas_ocupar.length > 0) {
      const ocuparIds = anfitrionas_ocupar.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
      
      if (ocuparIds.length > 0) {
        await query(
          `UPDATE usuarios SET estado_servicio = 2 WHERE id_usuario IN (${ocuparIds.map(() => '?').join(',')})`,
          ocuparIds
        );
      }
    }


    if (!solo_visual && servicio_id) {
      await query(
        'DELETE FROM servicio_usuarios WHERE id_servicio = ?',
        [servicio_id]
      );

      if (anfitrionas_ocupar.length > 0) {
        const ocuparIds = anfitrionas_ocupar.map((id: string) => parseInt(id)).filter((id: number) => !isNaN(id));
        
        for (const userId of ocuparIds) {
          await query(
            'INSERT INTO servicio_usuarios (id_servicio, id_usuario) VALUES (?, ?)',
            [servicio_id, userId]
          );
        }
      }
    }

    res.status(200).json({ 
      success: true, 
      message: 'Estados de anfitrionas actualizados correctamente',
      data: {
        liberadas: anfitrionas_liberar.length,
        ocupadas: anfitrionas_ocupar.length,
        solo_visual
      }
    });

  } catch (error) {
   
    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}