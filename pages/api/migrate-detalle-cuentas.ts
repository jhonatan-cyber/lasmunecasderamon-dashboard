import { NextApiRequest, NextApiResponse } from 'next';
import { query } from '@/lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // 1. Agregar created_by a detalle_cuentas para trazabilidad de quién agregó cada producto
    await query('ALTER TABLE detalle_cuentas ADD COLUMN created_by VARCHAR(50) DEFAULT NULL', []);
    
    // 2. Opcional: Si queremos que las cuentas viejas tengan un "dueño", podemos copiar el created_by de la cuenta
    // Pero por ahora, lo dejamos en NULL para los viejos para no falsear info.
    
    return res.status(200).json({ 
      success: true, 
      message: 'Columna created_by agregada exitosamente a la tabla detalle_cuentas' 
    });
  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
}
