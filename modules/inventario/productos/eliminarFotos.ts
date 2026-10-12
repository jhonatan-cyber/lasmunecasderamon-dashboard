import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '@/lib/database/db';
import logger from '@/lib/utils/logger';

/** Se ejecuta después del commit para conservar las fotos si la transacción falla. */
export async function eliminarFotosProductosSinUso(fotos: Array<string | null>) {
  const directory = path.resolve(process.cwd(), 'public', 'img', 'products');
  let failedImages = 0;
  for (const foto of new Set(fotos)) {
    if (!foto || foto === 'default.png' || !/^[\w.-]+\.(png|jpe?g|webp|gif)$/i.test(foto)) continue;
    const target = path.resolve(directory, foto);
    if (path.dirname(target) !== directory) continue;
    try {
      const references = await query<any[]>(
        'SELECT 1 FROM productos WHERE foto = ? UNION ALL SELECT 1 FROM inventario_presentaciones WHERE foto = ? LIMIT 1',
        [foto, foto]
      );
      if (references.length) continue;
      await fs.unlink(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      failedImages++;
      logger.captureException(error, { context: 'CategoryDelete:images', foto });
    }
  }
  return failedImages;
}
